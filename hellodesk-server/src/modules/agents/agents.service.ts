import { Injectable, BadRequestException } from '@nestjs/common';
import { getAgentStatus, setAgentStatus, listAgentStatuses } from '../../lib/redis.js';
import { processQueue } from '../assignment/assignment.service.js';

@Injectable()
export class AgentsService {
    async getStatus(workspaceId: string, userId: string) {
        const status = await getAgentStatus(workspaceId, userId);
        return { status };
    }

    async setStatus(workspaceId: string, userId: string, status: string) {
        if (!status) {
            throw new BadRequestException('Status is required');
        }
        await setAgentStatus(workspaceId, userId, status);
        if (status === 'available') {
            processQueue(workspaceId).catch(console.error);
        }
        return { status };
    }

    async listPresence(workspaceId: string) {
        const members = await listAgentStatuses(workspaceId);
        return { members };
    }
}
