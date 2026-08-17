import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository.js';
import { logger } from '../../lib/logger.js';
import { withRetry } from '../../lib/retry.js';
import { getIoInstance } from '../../lib/socket-instance.js';
import type { AuthUser } from '../../lib/auth.js';
import type { ConversationListQuery } from './conversations.types.js';

@Injectable()
export class ConversationsService {
    constructor(private readonly repository: ConversationsRepository) {}

    async listConversations(workspaceId: string, query: ConversationListQuery & { page?: number; limit?: number }, user: AuthUser) {
        const isAdmin = user.roleName === 'admin';
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;

        const whereClause: any = {
            workspaceId,
            ...(query.status && query.status !== 'all' ? { status: query.status as any } : {}),
            ...(query.channel && query.channel !== 'all' ? { channel: query.channel as any } : {}),
        };

        if (!isAdmin) {
            whereClause.assigneeId = user.id;
        } else {
            if (query.assignee === 'unassigned') {
                whereClause.assigneeId = null;
            } else if (query.assignee && query.assignee !== 'all') {
                whereClause.assigneeId = query.assignee;
            }
        }

        const [total, conversations] = await Promise.all([
            this.repository.countConversations(whereClause),
            this.repository.findManyConversations(whereClause, skip, limit),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            conversations,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
                nextPage: page < totalPages ? page + 1 : null,
            },
        };
    }

    async getConversation(id: string, workspaceId: string, user: AuthUser) {
        const conversation = await this.repository.findConversationById(id, workspaceId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        if (user.roleName !== 'admin' && conversation.assigneeId !== user.id) {
            throw new NotFoundException('Conversation not found');
        }

        return conversation;
    }

    async addMessage(id: string, workspaceId: string, input: any, userId: string) {
        const conversation = await this.repository.findConversationSimple(id, workspaceId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const isMediaAttachment = input.attachments && input.attachments.length > 0;
        const bodyText =
            input.body && input.body.trim().length > 0
                ? input.body
                : isMediaAttachment
                ? `[Attachment: ${input.mediaType || 'file'}]`
                : '';

        const message = await this.repository.createMessage({
            conversationId: id,
            senderType: 'agent',
            senderUserId: userId,
            body: bodyText,
            isInternalNote: input.isInternalNote ?? false,
            mediaType: input.mediaType ?? undefined,
            attachments: input.attachments ?? undefined,
        });

        await this.repository.updateConversationDate(id);

        if (!input.isInternalNote) {
            const { requestAiSummary, requestAiDraft } = await import('../../services/ai.worker.js');
            requestAiSummary(id);
            requestAiDraft(id);
        }

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('message:created', { conversationId: id, message });
            if (!input.isInternalNote && conversation.contact?.visitorId) {
                io.to(`visitor:${conversation.contact.visitorId}`).emit('message:created', { conversationId: id, message });
            }
        }

        return { message, conversation };
    }

    async addEmailMessage(id: string, workspaceId: string, input: any, userId: string, user: AuthUser) {
        const conversation = await this.repository.findConversationById(id, workspaceId);
        if (!conversation || !conversation.contact?.email) {
            throw new BadRequestException('Conversation has no associated email contact');
        }

        const isMediaAttachment = input.attachments && input.attachments.length > 0;
        const bodyText =
            input.body && input.body.trim().length > 0
                ? input.body
                : isMediaAttachment
                ? `[Attachment: ${input.mediaType || 'file'}]`
                : '';

        const message = await this.repository.createMessage({
            conversationId: id,
            senderType: 'agent',
            senderUserId: userId,
            body: bodyText,
            mediaType: input.mediaType ?? undefined,
            attachments: input.attachments ?? undefined,
        });

        await this.repository.updateConversationDate(id);

        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_EMAIL;
        let emailSent = false;

        if (apiKey && from) {
            try {
                const response = await withRetry(() =>
                    fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from,
                            to: [conversation.contact.email],
                            subject: `Re: Conversation #${id.slice(0, 8)}`,
                            text: input.body,
                        }),
                    }),
                );

                if (response.ok) {
                    emailSent = true;
                    logger.info({ conversationId: id, to: conversation.contact.email }, 'Reply email sent');
                } else {
                    const text = await response.text();
                    logger.warn({ conversationId: id, status: response.status, text }, 'Resend email send failed');
                }
            } catch (err) {
                logger.error({ err, conversationId: id }, 'Failed sending reply email via Resend');
            }
        }

        const { requestAiSummary, requestAiDraft } = await import('../../services/ai.worker.js');
        requestAiSummary(id);
        requestAiDraft(id);

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('message:created', { conversationId: id, message });
        }

        return { message, emailSent };
    }

    async updateStatus(id: string, workspaceId: string, input: any) {
        const conversation = await this.repository.findConversationSimple(id, workspaceId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const updated = await this.repository.updateConversationStatus(id, input.status);

        if (input.status === 'open' && !updated.assigneeId) {
            const assignmentService = await import('../assignment/assignment.service.js');
            await assignmentService.assignConversation(id, workspaceId);
        }

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('conversation:updated', { conversationId: id, conversation: updated });
            if (updated.contact?.visitorId) {
                io.to(`visitor:${updated.contact.visitorId}`).emit('conversation:updated', { conversationId: id, conversation: updated });
            }
        }

        return updated;
    }

    async reassign(id: string, workspaceId: string, input: any) {
        const conversation = await this.repository.findConversationSimple(id, workspaceId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const updated = await this.repository.updateConversationAssignee(id, input.assigneeId);
        
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('conversation:updated', { conversationId: id, conversation: updated });
            if (updated.contact?.visitorId) {
                io.to(`visitor:${updated.contact.visitorId}`).emit('conversation:updated', { conversationId: id, conversation: updated });
            }
        }
        
        return updated;
    }

    async markRead(id: string, workspaceId: string) {
        const conversation = await this.repository.findConversationSimple(id, workspaceId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        await this.repository.updateMessagesAsRead(id);

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('message:read', { conversationId: id, readAt: new Date().toISOString() });
            if (conversation.contact?.visitorId) {
                io.to(`visitor:${conversation.contact.visitorId}`).emit('message:read', { conversationId: id, readAt: new Date().toISOString() });
            }
        }

        return { ok: true, visitorId: conversation.contact?.visitorId ?? null };
    }

    async getAiSummary(id: string, workspaceId: string) {
        const conversation = await this.repository.findConversationSimple(id, workspaceId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const summaryMsg = await this.repository.findAiSummary(id);
        return { summary: summaryMsg?.body ?? null };
    }

    async getAiDraft(id: string, workspaceId: string) {
        const conversation = await this.repository.findConversationSimple(id, workspaceId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const draftMsg = await this.repository.findAiDraft(id);
        return { draft: draftMsg?.body ?? null };
    }

    async rateConversation(id: string, rating: number, feedbackOption: string) {
        if (!rating || rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        const updated = await this.repository.updateRating(id, rating, feedbackOption ?? '');
        return { conversation: updated };
    }
}
