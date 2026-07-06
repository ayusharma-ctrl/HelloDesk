import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { withRetry } from '../../lib/retry.js';
import type { ConversationListQuery } from './conversations.types.js';
import type { SendMessageInput, SendEmailMessageInput, UpdateStatusInput, ReassignInput } from './conversations.schema.js';

export async function listConversations(workspaceId: string, query: ConversationListQuery) {
    return prisma.conversation.findMany({
        where: {
            workspaceId,
            ...(query.status ? { status: query.status as any } : {}),
            ...(query.assignee ? { assigneeId: query.assignee } : {}),
            ...(query.channel ? { channel: query.channel as any } : {}),
        },
        include: { contact: true, assignee: { include: { role: true } }, messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
    });
}

export async function getConversation(id: string, workspaceId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: { id, workspaceId },
        include: { contact: true, assignee: { include: { role: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }
    return conversation;
}

export async function addMessage(conversationId: string, workspaceId: string, input: SendMessageInput, senderUserId: string) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId }, include: { contact: true } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    const message = await prisma.message.create({
        data: { conversationId, senderType: 'agent', senderUserId, body: input.body },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageId: message.id, updatedAt: new Date() },
    });

    import('../../services/ai.worker.js').then(mod => {
        mod.requestAiSummary(conversationId);
    });

    logger.info({ conversationId, senderUserId }, 'agent message created');
    return { conversation, message };
}

export async function addEmailMessage(conversationId: string, workspaceId: string, input: SendEmailMessageInput, senderUserId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
        include: { contact: true, messages: { where: { emailMessageId: { not: null } }, take: 1 } },
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    const recipientEmail = conversation.contact?.email;
    if (!recipientEmail) {
        const err = new Error('Conversation has no contact email') as any;
        err.status = 400;
        throw err;
    }

    const inboundThreadId = conversation.messages[0]?.emailMessageId ?? null;
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    let outboundMessageId: string | null = null;

    if (resendApiKey && resendFrom) {
        try {
            const response = await withRetry(() => fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: resendFrom,
                    to: [recipientEmail],
                    subject: input.subject ?? 'Re: Support request',
                    text: input.body,
                    headers: { 'In-Reply-To': inboundThreadId ?? '', References: inboundThreadId ?? '' },
                }),
            }));

            if (response.ok) {
                const data = await response.json() as { id?: string };
                outboundMessageId = data.id ?? null;
            } else {
                logger.warn({ conversationId, status: response.status }, 'Resend email failed');
            }
        } catch (err) {
            logger.error({ conversationId, err }, 'Resend email failed after retries');
        }
    } else {
        logger.warn({ conversationId }, 'Resend env vars missing — email not sent');
    }

    const message = await prisma.message.create({
        data: { conversationId, senderType: 'agent', senderUserId, body: input.body, emailMessageId: outboundMessageId, emailInReplyTo: inboundThreadId },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageId: message.id, updatedAt: new Date() } });

    import('../../services/ai.worker.js').then(mod => {
        mod.requestAiSummary(conversationId);
    });

    return { conversation, message, sent: Boolean(outboundMessageId) };
}

export async function updateStatus(conversationId: string, workspaceId: string, input: UpdateStatusInput) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    const data: any = { status: input.status };
    if (input.status === 'snoozed' && input.snoozedUntil) {
        data.snoozedUntil = new Date(input.snoozedUntil);
    }

    const updated = await prisma.conversation.update({ where: { id: conversationId }, data });

    if (conversation.status === 'open' && input.status !== 'open') {
        import('../assignment/assignment.service.js').then(mod => {
            mod.processQueue(workspaceId).catch(console.error);
        });
    }

    return updated;
}

export async function reassign(conversationId: string, workspaceId: string, input: ReassignInput) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    return prisma.conversation.update({ where: { id: conversationId }, data: { assigneeId: input.assigneeId } });
}

export async function markRead(conversationId: string, workspaceId: string) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    const updated = await prisma.message.updateMany({
        where: { conversationId, senderType: { not: 'agent' }, readAt: null },
        data: { readAt: new Date() },
    });

    const refreshed = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
        include: { contact: true, assignee: true, messages: { orderBy: { createdAt: 'asc' } } },
    });

    return { readCount: updated.count, conversation: refreshed };
}

export async function getAiSummary(conversationId: string, workspaceId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
        select: { aiSummary: true, aiSummaryAt: true },
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }
    return conversation;
}

export async function getAiDraft(conversationId: string, workspaceId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    // Find the latest AI draft
    const draftMessage = await prisma.message.findFirst({
        where: { conversationId, isAiDraft: true },
        orderBy: { createdAt: 'desc' }
    });

    return draftMessage;
}
