import { redis } from '../../lib/redis.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const MAX_CHATS_PER_AGENT = 5;

// Basic EWT calculation: 2 minutes per person ahead in queue
function calculateEWT(position: number): number {
    return position * 120;
}

export async function assignConversation(conversationId: string, workspaceId: string): Promise<boolean> {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (!conversation || conversation.status !== 'open') return false;

    // 1. Get all active agents in the workspace
    const agents = await prisma.user.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, role: { select: { name: true } } },
    });

    // 2. Filter who is 'available' in Redis
    const availableAgents: string[] = [];
    for (const agent of agents) {
        const status = await redis.hget(`workspace:${workspaceId}:presence`, agent.id);
        if (status === 'available') {
            availableAgents.push(agent.id);
        }
    }

    if (availableAgents.length === 0) {
        logger.info({ conversationId, workspaceId }, 'No available agents. Adding to queue.');
        await enqueueConversation(conversationId, workspaceId);
        return false;
    }

    // 3. Find the least busy agent
    let selectedAgentId: string | null = null;
    let minChats = Infinity;

    const agentWorkloads = await prisma.conversation.groupBy({
        by: ['assigneeId'],
        where: { workspaceId, status: 'open', assigneeId: { in: availableAgents } },
        _count: { _all: true },
    });

    const workloadMap = new Map<string, number>();
    agentWorkloads.forEach((w) => {
        if (w.assigneeId) workloadMap.set(w.assigneeId, w._count._all);
    });

    for (const agentId of availableAgents) {
        const chats = workloadMap.get(agentId) ?? 0;
        if (chats < minChats && chats < MAX_CHATS_PER_AGENT) {
            minChats = chats;
            selectedAgentId = agentId;
        }
    }

    if (!selectedAgentId) {
        logger.info({ conversationId, workspaceId }, 'All available agents are fully loaded. Adding to queue.');
        await enqueueConversation(conversationId, workspaceId);
        return false;
    }

    // 4. Assign the conversation
    logger.info({ conversationId, workspaceId, selectedAgentId }, 'Assigning conversation to agent');
    const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: { assigneeId: selectedAgentId, status: 'open' },
        include: { contact: true, assignee: true }
    });

    const io = (global as any).io;
    if (io) {
        io.to(`workspace:${workspaceId}`).emit('conversation:updated', { conversationId: updated.id, conversation: updated });
        if (updated.contact?.visitorId) {
            io.to(`visitor:${updated.contact.visitorId}`).emit('conversation:updated', { conversationId: updated.id, conversation: updated });
        }
    }

    return true;
}

export async function enqueueConversation(conversationId: string, workspaceId: string) {
    const queueKey = `workspace:${workspaceId}:queue`;
    // Check if already in queue to prevent duplicates
    const currentQueue = await redis.lrange(queueKey, 0, -1);
    if (currentQueue.includes(conversationId)) return;

    await redis.rpush(queueKey, conversationId);
    const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'pending' },
        include: { contact: true, assignee: true }
    });

    const io = (global as any).io;
    if (io) {
        io.to(`workspace:${workspaceId}`).emit('conversation:updated', { conversationId: updated.id, conversation: updated });
        if (updated.contact?.visitorId) {
            io.to(`visitor:${updated.contact.visitorId}`).emit('conversation:updated', { conversationId: updated.id, conversation: updated });
        }
    }
}

export async function processQueue(workspaceId: string) {
    const queueKey = `workspace:${workspaceId}:queue`;

    // Try processing multiple until we hit a block (e.g., no agents)
    while (true) {
        const queueLength = await redis.llen(queueKey);
        if (queueLength === 0) break;

        // Peek at the first item
        const conversationId = await redis.lindex(queueKey, 0);
        if (!conversationId) break;

        const assigned = await assignConversation(conversationId, workspaceId);
        if (assigned) {
            // It was assigned, so remove it from queue
            await redis.lpop(queueKey);
        } else {
            // Couldn't assign (no agents or full capacity), stop processing
            break;
        }
    }
}

export async function getQueueStatus(conversationId: string, workspaceId: string) {
    const queueKey = `workspace:${workspaceId}:queue`;
    const queue = await redis.lrange(queueKey, 0, -1);

    const index = queue.indexOf(conversationId);
    if (index === -1) {
        return { position: null, estimatedWaitSeconds: null };
    }

    const position = index + 1;
    return {
        position,
        estimatedWaitSeconds: calculateEWT(position),
    };
}
