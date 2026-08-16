import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class UsersRepository {
    constructor(private readonly prisma: PrismaService) {}

    async listUsers(workspaceId: string) {
        return this.prisma.user.findMany({
            where: { workspaceId },
            include: { role: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async findUserByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async findRoleByName(name: string) {
        return this.prisma.role.findUnique({ where: { name } });
    }

    async createUser(data: { workspaceId: string; roleId: string; email: string; name: string; passwordHash: string }) {
        return this.prisma.user.create({
            data,
            include: { role: true },
        });
    }

    async findUserInWorkspace(id: string, workspaceId: string) {
        return this.prisma.user.findFirst({
            where: { id, workspaceId },
        });
    }

    async updateUserRole(id: string, roleId: string) {
        return this.prisma.user.update({
            where: { id },
            data: { roleId },
            include: { role: true },
        });
    }

    async updateUserStatus(id: string, isActive: boolean) {
        return this.prisma.user.update({
            where: { id },
            data: { isActive },
            include: { role: true },
        });
    }
}
