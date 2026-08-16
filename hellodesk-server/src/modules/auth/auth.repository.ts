import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findRoleByName(name: string) {
        return this.prisma.role.findFirst({
            where: { name },
            include: { rolePermissions: { include: { permission: true } } },
        });
    }

    async findUniqueRoleByName(name: string) {
        return this.prisma.role.findUnique({ where: { name } });
    }

    async createRole(name: string) {
        return this.prisma.role.create({ data: { name } });
    }

    async findWorkspaceByName(name: string) {
        return this.prisma.workspace.findUnique({ where: { name } });
    }

    async createWorkspace(name: string) {
        return this.prisma.workspace.create({ data: { name } });
    }

    async findUserByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: { role: true, workspace: true },
        });
    }

    async findUserById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: { role: true, workspace: true },
        });
    }

    async createUser(data: { workspaceId: string; roleId: string; email: string; name: string; passwordHash: string }) {
        return this.prisma.user.create({
            data,
            include: { role: true },
        });
    }
}
