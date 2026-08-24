import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PermissionsService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    /**
     * Compute effective permissions for a user:
     * 1. If admin, return all available system permissions.
     * 2. If explicit custom user_permissions exist, return those.
     * 3. Else if workspace_default_permissions exist, return workspace defaults.
     * 4. Fallback to role_permissions.
     */
    async getEffectivePermissions(userId: string, workspaceId: string, roleName: string): Promise<string[]> {
        if (roleName === 'admin') {
            const all = await this.prisma.permission.findMany({ select: { key: true } });
            return all.map((p) => p.key);
        }

        // Check user custom permissions
        const custom = await this.prisma.userPermission.findMany({
            where: { userId },
            include: { permission: true },
        });

        if (custom.length > 0) {
            return custom.map((cp) => cp.permission.key);
        }

        // Check workspace default permissions
        const wsDefaults = await this.prisma.workspaceDefaultPermission.findMany({
            where: { workspaceId },
            include: { permission: true },
        });

        if (wsDefaults.length > 0) {
            return wsDefaults.map((wd) => wd.permission.key);
        }

        // Fallback to role permissions
        const role = await this.prisma.role.findFirst({
            where: { name: roleName },
            include: { rolePermissions: { include: { permission: true } } },
        });

        return role?.rolePermissions.map((rp) => rp.permission.key) ?? [];
    }

    async getAllPermissions() {
        return this.prisma.permission.findMany({
            orderBy: { key: 'asc' },
        });
    }

    async getWorkspaceDefaults(workspaceId: string) {
        const defaults = await this.prisma.workspaceDefaultPermission.findMany({
            where: { workspaceId },
            include: { permission: true },
        });

        if (defaults.length > 0) {
            return defaults.map((d) => d.permission);
        }

        // Fallback to agent role default permissions
        const agentRole = await this.prisma.role.findFirst({
            where: { name: 'agent' },
            include: { rolePermissions: { include: { permission: true } } },
        });

        return agentRole?.rolePermissions.map((rp) => rp.permission) ?? [];
    }

    async updateWorkspaceDefaults(workspaceId: string, permissionKeys: string[]) {
        const permissions = await this.prisma.permission.findMany({
            where: { key: { in: permissionKeys } },
        });

        await this.prisma.workspaceDefaultPermission.deleteMany({
            where: { workspaceId },
        });

        if (permissions.length > 0) {
            await this.prisma.workspaceDefaultPermission.createMany({
                data: permissions.map((p) => ({
                    workspaceId,
                    permissionId: p.id,
                })),
            });
        }

        return this.getWorkspaceDefaults(workspaceId);
    }

    async getUserPermissionOverrides(userId: string, workspaceId: string, roleName: string) {
        const custom = await this.prisma.userPermission.findMany({
            where: { userId },
            include: { permission: true },
        });

        const effective = await this.getEffectivePermissions(userId, workspaceId, roleName);

        return {
            hasCustomOverrides: custom.length > 0,
            effectivePermissions: effective,
            customPermissions: custom.map((c) => c.permission.key),
        };
    }

    async updateUserPermissionOverrides(userId: string, workspaceId: string, permissionKeys: string[]) {
        const permissions = await this.prisma.permission.findMany({
            where: { key: { in: permissionKeys } },
        });

        await this.prisma.userPermission.deleteMany({
            where: { userId },
        });

        if (permissions.length > 0) {
            await this.prisma.userPermission.createMany({
                data: permissions.map((p) => ({
                    userId,
                    permissionId: p.id,
                })),
            });
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        return this.getUserPermissionOverrides(userId, workspaceId, user?.role.name || 'agent');
    }

    async resetUserPermissionOverrides(userId: string, workspaceId: string) {
        await this.prisma.userPermission.deleteMany({
            where: { userId },
        });

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        return this.getUserPermissionOverrides(userId, workspaceId, user?.role.name || 'agent');
    }
}
