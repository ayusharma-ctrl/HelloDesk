import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { WidgetRepository } from './widget.repository.js';
import { startConversationSchema, sendWidgetMessageSchema } from './widget.schema.js';
import { listAgentStatuses } from '../../lib/redis.js';
import { getIoInstance } from '../../lib/socket-instance.js';
import * as assignmentService from '../assignment/assignment.service.js';
import { requestAiSummary, requestAiDraft } from '../../services/ai.worker.js';
import crypto from 'crypto';

@Injectable()
export class WidgetService {
    constructor(@Inject(WidgetRepository) private readonly repository: WidgetRepository) {}

    async startConversation(body: any) {
        const input = startConversationSchema.parse(body);
        const workspace = await this.repository.findWorkspace(input.workspaceId);
        if (!workspace || !workspace.isActive) {
            throw new NotFoundException('Workspace not found');
        }

        const visitorId = input.visitorId ?? crypto.randomUUID();
        const channel = input.email ? 'email' : 'chat';

        const contact = await this.repository.upsertContact(visitorId, input.workspaceId, input.email, input.name);
        const conversation = await this.repository.createConversation(input.workspaceId, contact.id, channel);

        const startBody =
            input.body && input.body.trim().length > 0
                ? input.body
                : input.attachments && input.attachments.length > 0
                ? `[Attachment: ${input.mediaType || 'file'}]`
                : '';

        const message = await this.repository.createMessage({
            conversationId: conversation.id,
            senderType: 'contact',
            body: startBody,
            attachments: input.attachments ?? undefined,
            mediaType: input.mediaType ?? undefined,
        });

        await this.repository.updateConversationLastMessage(conversation.id, message.id);
        await assignmentService.assignConversation(conversation.id, input.workspaceId);

        const refreshedConversation = await this.repository.findConversationWithDetails(conversation.id);

        requestAiSummary(conversation.id);
        requestAiDraft(conversation.id);

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${input.workspaceId}`).emit('conversation:created', { conversation: refreshedConversation });
            io.to(`workspace:${input.workspaceId}`).emit('message:created', { conversationId: conversation.id, message });
        }

        return {
            conversation: refreshedConversation,
            message,
            visitorId,
        };
    }

    async sendMessage(body: any) {
        const input = sendWidgetMessageSchema.parse(body);
        const conversation = await this.repository.findConversationSimple(input.conversationId);
        if (!conversation || conversation.contact?.visitorId !== input.visitorId) {
            throw new NotFoundException('Conversation not found');
        }

        const sendBody =
            input.body && input.body.trim().length > 0
                ? input.body
                : input.attachments && input.attachments.length > 0
                ? `[Attachment: ${input.mediaType || 'file'}]`
                : '';

        const message = await this.repository.createMessage({
            conversationId: input.conversationId,
            senderType: 'contact',
            body: sendBody,
            attachments: input.attachments ?? undefined,
            mediaType: input.mediaType ?? undefined,
        });

        await this.repository.updateConversationLastMessage(input.conversationId, message.id);

        requestAiSummary(input.conversationId);
        requestAiDraft(input.conversationId);

        const io = getIoInstance();
        if (io && conversation.workspaceId) {
            io.to(`workspace:${conversation.workspaceId}`).emit('message:created', { conversationId: input.conversationId, message });
            // Let the widget itself know the message was accepted/synced, just in case multiple tabs are open
            io.to(`visitor:${input.visitorId}`).emit('message:created', { conversationId: input.conversationId, message });
        }

        return { message, conversation };
    }

    async getHistory(conversationId: string, visitorId: string) {
        const conversation = await this.repository.findConversationHistory(conversationId, visitorId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }
        return {
            status: conversation.status,
            assigneeName: (conversation as any).assigneeName ?? null,
            rating: (conversation as any).rating ?? null,
            ratingFeedback: (conversation as any).ratingFeedback ?? null,
            messages: conversation.messages,
        };
    }

    async kbSuggestions(q: string, workspaceId?: string) {
        const articles = await this.repository.findKbSuggestions(q, workspaceId);
        return { articles };
    }

    async markRead(conversationId: string, visitorId: string) {
        const conversation = await this.repository.findConversationSimple(conversationId);
        if (!conversation || conversation.contact?.visitorId !== visitorId) {
            throw new NotFoundException('Conversation not found');
        }

        await this.repository.updateMessagesAsRead(conversationId);

        const io = getIoInstance();
        if (io && conversation.workspaceId) {
            io.to(`workspace:${conversation.workspaceId}`).emit('message:read', { conversationId, readAt: new Date().toISOString() });
            io.to(`visitor:${visitorId}`).emit('message:read', { conversationId, readAt: new Date().toISOString() });
        }

        return { ok: true };
    }

    async getStatus(workspaceId: string) {
        if (!workspaceId) return { online: false, theme: null };
        const workspace = await this.repository.findWorkspace(workspaceId);
        const statuses = await listAgentStatuses(workspaceId);
        const online = statuses.some((s: any) => s.status === 'available' || s.status === 'busy');
        return { online, theme: workspace?.theme ?? null };
    }
}
