import { Controller, Get, Put, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { PermissionsService } from './permissions.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
    constructor(
        private readonly permissionsService: PermissionsService,
        private readonly prisma: PrismaService,
    ) {}

    @Get()
    async getAllPermissions() {
        const permissions = await this.permissionsService.getAllPermissions();
        return { permissions };
    }

    @RequirePermission('agent:manage')
    @Get('workspace/defaults')
    async getWorkspaceDefaults(@CurrentUser() user: AuthUser) {
        const defaults = await this.permissionsService.getWorkspaceDefaults(user.workspaceId);
        return { defaults };
    }

    @RequirePermission('agent:manage')
    @Put('workspace/defaults')
    async updateWorkspaceDefaults(@CurrentUser() user: AuthUser, @Body() body: { permissionKeys: string[] }) {
        const defaults = await this.permissionsService.updateWorkspaceDefaults(user.workspaceId, body.permissionKeys || []);
        return { defaults };
    }

    @RequirePermission('agent:manage')
    @Get('users/:userId')
    async getUserPermissions(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
        const targetUser = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        if (!targetUser || targetUser.workspaceId !== user.workspaceId) {
            throw new ForbiddenException('Target user not found in this workspace');
        }

        const details = await this.permissionsService.getUserPermissionOverrides(userId, user.workspaceId, targetUser.role.name);
        return details;
    }

    @RequirePermission('agent:manage')
    @Put('users/:userId')
    async updateUserPermissions(
        @CurrentUser() user: AuthUser,
        @Param('userId') userId: string,
        @Body() body: { permissionKeys: string[] },
    ) {
        const targetUser = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        if (!targetUser || targetUser.workspaceId !== user.workspaceId) {
            throw new ForbiddenException('Target user not found in this workspace');
        }

        const details = await this.permissionsService.updateUserPermissionOverrides(userId, user.workspaceId, body.permissionKeys || []);
        return details;
    }

    @RequirePermission('agent:manage')
    @Delete('users/:userId')
    async resetUserPermissions(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
        const targetUser = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        if (!targetUser || targetUser.workspaceId !== user.workspaceId) {
            throw new ForbiddenException('Target user not found in this workspace');
        }

        const details = await this.permissionsService.resetUserPermissionOverrides(userId, user.workspaceId);
        return details;
    }
}
