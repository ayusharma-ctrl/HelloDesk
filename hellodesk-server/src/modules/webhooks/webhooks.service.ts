import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import type { ResendInboundPayload } from './webhooks.types.js';

export async function processInboundEmail(workspaceId: string, payload: ResendInboundPayload) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace || !workspace.isActive) {
        const err = new Error('Workspace not found') as any;
        err.status = 404;
        throw err;
    }

    const senderEmail = payload.from ?? '';
    const body = payload.text ?? payload.html ?? '';
    const inboundMessageId = payload.headers?.['message-id'];
    const inReplyTo = payload.headers?.['in-reply-to'];
    const references = payload.headers?.references;

    // Try to thread to existing conversation by In-Reply-To / References headers
    const threadCandidates = [inReplyTo, references].filter((v): v is string => Boolean(v));
    let conversation: Awaited<ReturnType<typeof prisma.conversation.findFirst>> = null;

    if (threadCandidates.length > 0) {
        conversation = await prisma.conversation.findFirst({
            where: {
                workspaceId,
                channel: 'email',
                messages: { some: { OR: [{ emailMessageId: { in: threadCandidates } }, { emailInReplyTo: { in: threadCandidates } }] } },
            },
        });
    }

    // Find or create contact by email
    let contact = await prisma.contact.findFirst({ where: { workspaceId, email: senderEmail } });
    if (!contact) {
        contact = await prisma.contact.create({ data: { workspaceId, email: senderEmail, name: senderEmail } });
    }

    let isNew = false;
    // Create new conversation if no thread found
    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: { workspaceId, contactId: contact.id, channel: 'email', status: 'open' },
        });
        isNew = true;
    }

    const message = await prisma.message.create({
        data: {
            conversationId: conversation.id,
            senderType: 'contact',
            body,
            emailMessageId: inboundMessageId,
            emailInReplyTo: inReplyTo ?? references ?? null,
        },
    });

    await prisma.conversation.update({
        where: { id: conversation.id },
        data: { contactId: contact.id, lastMessageId: message.id, updatedAt: new Date(), ...(isNew ? {} : { status: 'open' }) },
    });

    if (isNew) {
        import('../assignment/assignment.service.js').then(mod => mod.assignConversation(conversation!.id, workspaceId));
    }

    import('../../services/ai.worker.js').then(mod => {
        mod.requestAiSummary(conversation!.id);
        mod.requestAiDraft(conversation!.id);
    });

    logger.info({ workspaceId, conversationId: conversation.id }, 'email webhook processed');
    return { conversationId: conversation.id, message };
}
