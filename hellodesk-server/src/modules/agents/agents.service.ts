import { getAgentStatus, setAgentStatus, listAgentStatuses } from '../../lib/redis.js';
import { processQueue } from '../assignment/assignment.service.js';

export async function getStatus(workspaceId: string, userId: string) {
    const status = await getAgentStatus(workspaceId, userId);
    return { status };
}

export async function setStatus(workspaceId: string, userId: string, status: string) {
    await setAgentStatus(workspaceId, userId, status);
    if (status === 'available') {
        processQueue(workspaceId).catch(console.error);
    }
    return { status };
}

export async function listPresence(workspaceId: string) {
    const members = await listAgentStatuses(workspaceId);
    return { members };
}
