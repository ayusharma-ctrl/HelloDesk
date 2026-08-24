import { Injectable, Inject } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository.js';
import { listAgentStatuses } from '../../lib/redis.js';

@Injectable()
export class DashboardService {
    constructor(@Inject(DashboardRepository) private readonly repository: DashboardRepository) {}

    async getOverview(workspaceId: string) {
        const [[open, pending, snoozed, resolved], allUsers, presenceMembers] = await Promise.all([
            this.repository.getConversationCounts(workspaceId),
            this.repository.getActiveUsersCount(workspaceId),
            listAgentStatuses(workspaceId),
        ]);

        const activeAgents = presenceMembers.filter((m: any) => m.status === 'available' || m.status === 'busy').length;

        return {
            overview: {
                conversations: { open, pending, snoozed, resolved },
                agents: { total: allUsers, active: activeAgents },
            },
        };
    }
}
