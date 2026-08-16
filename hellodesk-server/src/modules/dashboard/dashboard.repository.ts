import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DashboardRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getConversationCounts(workspaceId: string) {
        return Promise.all([
            this.prisma.conversation.count({ where: { workspaceId, status: 'open' } }),
            this.prisma.conversation.count({ where: { workspaceId, status: 'pending' } }),
            this.prisma.conversation.count({ where: { workspaceId, status: 'snoozed' } }),
            this.prisma.conversation.count({ where: { workspaceId, status: 'resolved' } }),
        ]);
    }

    async getActiveUsersCount(workspaceId: string) {
        return this.prisma.user.count({ where: { workspaceId, isActive: true } });
    }
}
