import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { withRetry } from '../../lib/retry.js';
import type { AuthUser } from '../../lib/auth.js';
import type { ConversationListQuery } from './conversations.types.js';
import type { SendMessageInput, SendEmailMessageInput, UpdateStatusInput, ReassignInput } from './conversations.schema.js';

export async function listConversations(workspaceId: string, query: ConversationListQuery, user: AuthUser) {
    const isAdmin = user.roleName === 'admin';
    const whereClause: any = {
        workspaceId,
        ...(query.status && query.status !== 'all' ? { status: query.status as any } : {}),
        ...(query.channel && query.channel !== 'all' ? { channel: query.channel as any } : {}),
    };

    if (!isAdmin) {
        // Non-admin agents can only view conversations explicitly assigned to them
        whereClause.assigneeId = user.id;
    } else {
        // Admins can see all, or filter by specific assignee or unassigned
        if (query.assignee === 'unassigned') {
            whereClause.assigneeId = null;
        } else if (query.assignee && query.assignee !== 'all') {
            whereClause.assigneeId = query.assignee;
        }
    }

    return prisma.conversation.findMany({
        where: whereClause,
        include: {
            contact: true,
            assignee: { include: { role: true } },
            messages: { where: { isAiDraft: false }, orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { updatedAt: 'desc' },
    });
}

export async function getConversation(id: string, workspaceId: string, user: AuthUser) {
    const conversation = await prisma.conversation.findFirst({
        where: { id, workspaceId },
        include: {
            contact: true,
            assignee: { include: { role: true } },
            messages: { where: { isAiDraft: false }, orderBy: { createdAt: 'asc' } }
        },
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
        const err = new Error('Access denied: Agents can only view their own assigned conversations') as any;
        err.status = 403;
        throw err;
    }

    return conversation;
}

export async function addMessage(conversationId: string, workspaceId: string, input: SendMessageInput, senderUserId: string, user: AuthUser) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId }, include: { contact: true } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    if (conversation.status === 'resolved') {
        const err = new Error('Cannot send messages to a resolved conversation. Please reopen the conversation first.') as any;
        err.status = 400;
        throw err;
    }

    if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
        const err = new Error('Access denied: Agents can only reply to their own assigned conversations') as any;
        err.status = 403;
        throw err;
    }

    // Clean up active AI drafts once the agent sends a reply
    await prisma.message.deleteMany({
        where: { conversationId, isAiDraft: true }
    });

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

export async function addEmailMessage(conversationId: string, workspaceId: string, input: SendEmailMessageInput, senderUserId: string, user: AuthUser) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
        include: { contact: true, messages: { where: { emailMessageId: { not: null } }, take: 1 } },
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    if (conversation.status === 'resolved') {
        const err = new Error('Cannot send messages to a resolved conversation. Please reopen the conversation first.') as any;
        err.status = 400;
        throw err;
    }

    if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
        const err = new Error('Access denied: Agents can only reply to their own assigned conversations') as any;
        err.status = 403;
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

    // Clean up active AI drafts once the agent sends an email reply
    await prisma.message.deleteMany({
        where: { conversationId, isAiDraft: true }
    });

    const message = await prisma.message.create({
        data: { conversationId, senderType: 'agent', senderUserId, body: input.body, emailMessageId: outboundMessageId, emailInReplyTo: inboundThreadId },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageId: message.id, updatedAt: new Date() } });

    import('../../services/ai.worker.js').then(mod => {
        mod.requestAiSummary(conversationId);
    });

    return { conversation, message, sent: Boolean(outboundMessageId) };
}

export async function updateStatus(conversationId: string, workspaceId: string, input: UpdateStatusInput, user: AuthUser) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    // Once a conversation is resolved, only admins can update/reopen it
    if (conversation.status === 'resolved' && user.roleName !== 'admin') {
        const err = new Error('Only admins can update resolved conversations') as any;
        err.status = 403;
        throw err;
    }

    // Agents can only update status of conversations assigned to them
    if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
        const err = new Error('Agents can only update their own assigned conversations') as any;
        err.status = 403;
        throw err;
    }

    const data: any = { status: input.status };
    if (input.status === 'snoozed' && input.snoozedUntil) {
        data.snoozedUntil = new Date(input.snoozedUntil);
    }

    const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data,
        include: { contact: true, assignee: { include: { role: true } } }
    });

    // If conversation is resolved/snoozed from open, trigger queue to assign next waiting conversation
    if (conversation.status === 'open' && input.status !== 'open') {
        import('../assignment/assignment.service.js').then(mod => {
            mod.processQueue(workspaceId).catch(console.error);
        });
    }

    return updated;
}

export async function reassign(conversationId: string, workspaceId: string, input: ReassignInput, user: AuthUser) {
    if (user.roleName !== 'admin') {
        const err = new Error('Only admins are authorized to reassign conversations') as any;
        err.status = 403;
        throw err;
    }

    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    const targetAssigneeId = (!input.assigneeId || input.assigneeId === 'unassigned') ? null : input.assigneeId;

    return prisma.conversation.update({
        where: { id: conversationId },
        data: { assigneeId: targetAssigneeId },
        include: { contact: true, assignee: { include: { role: true } } }
    });
}

export async function markRead(conversationId: string, workspaceId: string, user: AuthUser) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
        const err = new Error('Access denied') as any;
        err.status = 403;
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

export async function getAiSummary(conversationId: string, workspaceId: string, user: AuthUser) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
        select: { aiSummary: true, aiSummaryAt: true, assigneeId: true },
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
        const err = new Error('Access denied') as any;
        err.status = 403;
        throw err;
    }

    return { aiSummary: conversation.aiSummary, aiSummaryAt: conversation.aiSummaryAt };
}

export async function getAiDraft(conversationId: string, workspaceId: string, user: AuthUser) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
        select: { id: true, assigneeId: true }
    });
    if (!conversation) {
        const err = new Error('Conversation not found') as any;
        err.status = 404;
        throw err;
    }

    if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
        const err = new Error('Access denied') as any;
        err.status = 403;
        throw err;
    }

    // Find the latest AI draft
    const draftMessage = await prisma.message.findFirst({
        where: { conversationId, isAiDraft: true },
        orderBy: { createdAt: 'desc' }
    });

    return draftMessage;
}
