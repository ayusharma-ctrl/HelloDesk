import { prisma } from '../../lib/prisma.js';
import { listAgentStatuses } from '../../lib/redis.js';
import type { StartConversationInput, SendWidgetMessageInput } from './widget.schema.js';
import * as assignmentService from '../assignment/assignment.service.js';

export async function startConversation(input: StartConversationInput) {
    const workspace = await prisma.workspace.findUnique({ where: { id: input.workspaceId } });
    if (!workspace || !workspace.isActive) {
        const err = new Error('Workspace not found') as any;
        err.status = 404;
        throw err;
    }

    const visitorId = input.visitorId ?? crypto.randomUUID();
    const channel = input.email ? "email" : "chat";

    const contact = await prisma.contact.upsert({
        where: { visitorId },
        update: { ...(input.email ? { email: input.email } : {}), ...(input.name ? { name: input.name } : {}) },
        create: { workspaceId: input.workspaceId, visitorId, email: input.email, name: input.name },
    });

    const conversation = await prisma.conversation.create({
        data: { workspaceId: input.workspaceId, contactId: contact.id, channel, status: 'open' },
    });

    const message = await prisma.message.create({
        data: { conversationId: conversation.id, senderType: 'contact', body: input.body },
    });

    await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageId: message.id, updatedAt: new Date() },
    });

    // Run auto-assignment rules
    await assignmentService.assignConversation(conversation.id, input.workspaceId);

    const refreshedConversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: { contact: true, assignee: true }
    });

    import('../../services/ai.worker.js').then(mod => {
        mod.requestAiSummary(conversation.id);
        mod.requestAiDraft(conversation.id);
    });

    return { conversation: refreshedConversation || conversation, message, visitorId };
}

export async function sendMessage(input: SendWidgetMessageInput) {
    const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: { contact: true }
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    const message = await prisma.message.create({
        data: { conversationId: input.conversationId, senderType: 'contact', body: input.body },
    });

    await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageId: message.id, updatedAt: new Date() },
    });

    import('../../services/ai.worker.js').then(mod => {
        mod.requestAiSummary(input.conversationId);
        mod.requestAiDraft(input.conversationId);
    });

    return { conversation, message };
}

export async function getHistory(conversationId: string, visitorId: string) {
    const contact = await prisma.contact.findUnique({ where: { visitorId } });
    if (!contact) return { messages: [] };

    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, contactId: contact.id },
    });

    if (!conversation) return { messages: [] };

    // Mark agent messages as read when visitor retrieves history
    const updateResult = await prisma.message.updateMany({
        where: { conversationId, senderType: 'agent', readAt: null },
        data: { readAt: new Date() },
    });

    const refreshed = await prisma.conversation.findFirst({
        where: { id: conversationId, contactId: contact.id },
        include: { contact: true, assignee: true, messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (updateResult.count > 0) {
        const io = (global as any).io;
        if (io) {
            io.to(`workspace:${conversation.workspaceId}`).emit('conversation:updated', {
                conversationId,
                conversation: refreshed
            });
        }
    }

    const queueInfo = await assignmentService.getQueueStatus(conversationId, conversation.workspaceId);

    return {
        messages: refreshed?.messages ?? [],
        status: refreshed?.status ?? 'open',
        assigneeName: refreshed?.assignee?.name,
        ...queueInfo
    };
}

export async function kbSuggestions(q: string, workspaceId?: string) {
    if (!q.trim()) return [];
    return prisma.article.findMany({
        where: {
            status: 'published',
            ...(workspaceId ? { workspaceId } : {}),
            OR: [
                { title: { contains: q.trim(), mode: 'insensitive' } },
                { content: { contains: q.trim(), mode: 'insensitive' } },
            ],
        },
        select: { id: true, title: true, slug: true },
        take: 3,
    });
}

export async function getStatus(workspaceId: string) {
    const agents = await listAgentStatuses(workspaceId);
    return agents.some(a => a.status === 'available');
}
