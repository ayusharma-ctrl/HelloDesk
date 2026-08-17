import { Injectable, ConflictException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { AuthRepository } from './auth.repository.js';
import { signupSchema, loginSchema } from './auth.schema.js';
import { hashPassword, signToken, verifyPassword } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';
import type { AuthResponse, AuthUserDto } from './auth.types.js';

import { PermissionsService } from '../permissions/permissions.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly permissionsService: PermissionsService,
    ) {}

    async getPermissionFlags(userId: string, workspaceId: string, roleName: string): Promise<string[]> {
        return this.permissionsService.getEffectivePermissions(userId, workspaceId, roleName);
    }

    async signup(body: any): Promise<AuthResponse> {
        const input = signupSchema.parse(body);
        const workspaceName = input.workspaceName.toLowerCase().trim().replace(/\s+/g, '-');

        let workspace = await this.authRepository.findWorkspaceByName(workspaceName);
        let adminRole = await this.authRepository.findUniqueRoleByName('admin');
        if (!adminRole) {
            adminRole = await this.authRepository.createRole('admin');
        }

        const isNewWorkspace = !workspace;
        if (isNewWorkspace) {
            workspace = await this.authRepository.createWorkspace(workspaceName);
            await this.permissionsService.updateWorkspaceDefaults(workspace.id, [
                'conversation:reply',
                'conversation:status:update',
                'dashboard:view',
                'team:view',
            ]);
        }

        if (!workspace) throw new InternalServerErrorException('Workspace could not be created');

        const existingUser = await this.authRepository.findUserByEmail(input.email);
        if (existingUser) {
            throw new ConflictException('A user with that email already exists');
        }

        const agentRole = await this.authRepository.findUniqueRoleByName('agent');
        const roleId = isNewWorkspace ? adminRole.id : (agentRole?.id ?? adminRole.id);

        const passwordHash = await hashPassword(input.password);
        const user = await this.authRepository.createUser({
            workspaceId: workspace.id,
            roleId,
            email: input.email,
            name: input.name,
            passwordHash,
        });

        const permissions = await this.getPermissionFlags(user.id, workspace.id, user.role.name);
        const token = signToken({ id: user.id, email: user.email, workspaceId: workspace.id, roleName: user.role.name });
        logger.info({ workspaceId: workspace.id, userId: user.id }, 'signup succeeded');

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                },
            },
            permissions,
        };
    }

    async login(body: any): Promise<AuthResponse> {
        const input = loginSchema.parse(body);
        const user = await this.authRepository.findUserByEmail(input.email);

        if (!user) {
            throw new UnauthorizedException('No account found with this email address.');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Your user account has been deactivated. Please contact your administrator.');
        }

        if (!user.workspace.isActive) {
            throw new UnauthorizedException('Your workspace account is currently suspended. Please contact support.');
        }

        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException('Incorrect password. Please double check and try again.');
        }

        const permissions = await this.getPermissionFlags(user.id, user.workspaceId, user.role.name);
        const token = signToken({ id: user.id, email: user.email, workspaceId: user.workspaceId, roleName: user.role.name });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
                workspace: {
                    id: user.workspaceId,
                    name: user.workspace.name,
                    theme: user.workspace.theme,
                },
            },
            permissions,
        };
    }

    async getMe(userId: string): Promise<AuthUserDto & { permissions: string[] }> {
        const user = await this.authRepository.findUserById(userId);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const permissions = await this.getPermissionFlags(user.id, user.workspace.id, user.role.name);

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.name,
            workspace: {
                id: user.workspace.id,
                name: user.workspace.name,
                shortName: user.workspace.shortName,
                logoUrl: user.workspace.logoUrl,
                theme: user.workspace.theme,
            },
            permissions,
        };
    }
}
