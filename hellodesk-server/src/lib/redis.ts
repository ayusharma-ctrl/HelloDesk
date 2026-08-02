import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export async function setAgentStatus(workspaceId: string, userId: string, status: string) {
    await redis.hset(`workspace:${workspaceId}:presence`, userId, status);
    return status;
}

export async function getAgentStatus(workspaceId: string, userId: string) {
    const status = await redis.hget(`workspace:${workspaceId}:presence`, userId);
    return status ?? 'offline';
}

export async function listAgentStatuses(workspaceId: string) {
    const all = await redis.hgetall(`workspace:${workspaceId}:presence`);
    return Object.entries(all).map(([userId, status]) => ({ userId, status: status as string }));
}
