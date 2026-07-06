import { prisma } from '../../lib/prisma.js';
import { listAgentStatuses } from '../../lib/redis.js';
import type { DashboardOverview } from './dashboard.types.js';

export async function getOverview(workspaceId: string): Promise<DashboardOverview> {
    const [open, pending, snoozed, resolved, allUsers, presenceMembers] = await Promise.all([
        prisma.conversation.count({ where: { workspaceId, status: 'open' } }),
        prisma.conversation.count({ where: { workspaceId, status: 'pending' } }),
        prisma.conversation.count({ where: { workspaceId, status: 'snoozed' } }),
        prisma.conversation.count({ where: { workspaceId, status: 'resolved' } }),
        prisma.user.count({ where: { workspaceId, isActive: true } }),
        listAgentStatuses(workspaceId),
    ]);

    const activeAgents = presenceMembers.filter((m: any) => m.status === 'available' || m.status === 'busy').length;

    return {
        conversations: { open, pending, snoozed, resolved },
        agents: { total: allUsers, active: activeAgents },
    };
}
