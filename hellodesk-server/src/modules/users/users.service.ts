import { Injectable, Inject, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { WorkspaceEmailService } from '../email/email.service.js';
import { inviteSchema, updateRoleSchema, updateStatusSchema } from './users.schema.js';
import { hashPassword } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';
import crypto from 'crypto';

@Injectable()
export class UsersService {
    constructor(
        @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
        @Inject(WorkspaceEmailService) private readonly emailService: WorkspaceEmailService,
    ) {}

    private async sendInviteEmail(workspaceId: string, to: string, name: string, tempPassword: string, appBaseUrl: string): Promise<void> {
        await this.emailService.sendWorkspaceEmail(workspaceId, {
            to,
            subject: 'You have been invited to HelloDesk',
            text: `Hi ${name},\n\nYou have been invited to HelloDesk. Log in at:\n${appBaseUrl}/login\n\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nPlease change your password after first login.\n\nThe HelloDesk team`,
        });
    }

    async listUsers(workspaceId: string) {
        return this.usersRepository.listUsers(workspaceId);
    }

    async inviteUser(workspaceId: string, body: any) {
        const input = inviteSchema.parse(body);
        const roleRecord = await this.usersRepository.findRoleByName(input.role);
        if (!roleRecord) {
            throw new BadRequestException('Unknown role');
        }

        const existing = await this.usersRepository.findUserByEmail(input.email);
        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        const tempPassword = crypto.randomBytes(6).toString('hex');
        const passwordHash = await hashPassword(tempPassword);

        const user = await this.usersRepository.createUser({
            workspaceId,
            roleId: roleRecord.id,
            name: input.name,
            email: input.email,
            passwordHash,
        });

        const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
        void this.sendInviteEmail(workspaceId, user.email, user.name, tempPassword, appBaseUrl);
        logger.info({ userId: user.id, workspaceId }, 'user invited');

        return user;
    }

    async updateRole(userId: string, workspaceId: string, body: any) {
        const input = updateRoleSchema.parse(body);
        const target = await this.usersRepository.findUserInWorkspace(userId, workspaceId);
        if (!target) {
            throw new NotFoundException('User not found');
        }

        const roleRecord = await this.usersRepository.findRoleByName(input.role);
        if (!roleRecord) {
            throw new BadRequestException('Unknown role');
        }

        return this.usersRepository.updateUserRole(userId, roleRecord.id);
    }

    async updateStatus(userId: string, workspaceId: string, body: any) {
        const input = updateStatusSchema.parse(body);
        const target = await this.usersRepository.findUserInWorkspace(userId, workspaceId);
        if (!target) {
            throw new NotFoundException('User not found');
        }

        return this.usersRepository.updateUserStatus(userId, input.isActive);
    }
}
