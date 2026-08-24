import { Injectable, NotFoundException, Inject, Optional } from '@nestjs/common';
import { WidgetRepository } from './widget.repository.js';
import { startConversationSchema, sendWidgetMessageSchema } from './widget.schema.js';
import { listAgentStatuses } from '../../lib/redis.js';
import { getIoInstance } from '../../lib/socket-instance.js';
import * as assignmentService from '../assignment/assignment.service.js';
import { requestAiSummary, requestAiDraft } from '../../services/ai.worker.js';
import { AgentRuntimeService } from '../ai/agent/agent-runtime.service.js';
import { logger } from '../../lib/logger.js';
import crypto from 'crypto';

@Injectable()
export class WidgetService {
    constructor(
        @Inject(WidgetRepository) private readonly repository: WidgetRepository,
        @Inject(AgentRuntimeService) private readonly agentRuntime: AgentRuntimeService
    ) { }

    async startConversation(body: any) {
        const input = startConversationSchema.parse(body);
        const workspace = await this.repository.findWorkspace(input.workspaceId);
        if (!workspace || !workspace.isActive) {
            throw new NotFoundException('Workspace not found');
        }

        const visitorId = input.visitorId ?? crypto.randomUUID();
        const channel = input.email ? 'email' : 'chat';

        const contact = await this.repository.upsertContact(visitorId, workspace.id, input.email, input.name);
        const conversation = await this.repository.createConversation(workspace.id, contact.id, channel);

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

        const isAutonomous = workspace.aiEnabled && (workspace as any).aiAutonomous !== false;

        if (!isAutonomous) {
            await assignmentService.assignConversation(conversation.id, workspace.id);
        }

        const refreshedConversation = await this.repository.findConversationWithDetails(conversation.id);

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspace.id}`).emit('conversation:created', { conversation: refreshedConversation });
            io.to(`workspace:${workspace.id}`).emit('message:created', { conversationId: conversation.id, message });
        }

        // Autonomous AI Execution
        if (isAutonomous && this.agentRuntime && startBody) {
            setImmediate(async () => {
                try {
                    await this.agentRuntime?.runAgent(
                        workspace.id,
                        conversation.id,
                        startBody,
                        'chat'
                    );
                } catch (err) {
                    logger.error({ err, conversationId: conversation.id }, 'Autonomous agent run failed, triggering background draft');
                    requestAiSummary(conversation.id);
                    requestAiDraft(conversation.id);
                }
            });
        } else {
            requestAiSummary(conversation.id);
            requestAiDraft(conversation.id);
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

        const workspace = await this.repository.findWorkspace(conversation.workspaceId);

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

        const io = getIoInstance();
        if (io && conversation.workspaceId) {
            io.to(`workspace:${conversation.workspaceId}`).emit('message:created', { conversationId: input.conversationId, message });
            // Let the widget itself know the message was accepted/synced, just in case multiple tabs are open
            io.to(`visitor:${input.visitorId}`).emit('message:created', { conversationId: input.conversationId, message });
        }

        const isAutonomous = (workspace?.aiEnabled ?? false) && ((workspace as any)?.aiAutonomous !== false) && !conversation.assigneeId;

        // Autonomous AI Execution for unassigned conversations
        if (isAutonomous && this.agentRuntime && sendBody) {
            setImmediate(async () => {
                try {
                    await this.agentRuntime?.runAgent(
                        conversation.workspaceId,
                        input.conversationId,
                        sendBody,
                        'chat'
                    );
                } catch (err) {
                    logger.error({ err, conversationId: input.conversationId }, 'Autonomous agent run failed, triggering background draft');
                    requestAiSummary(input.conversationId);
                    requestAiDraft(input.conversationId);
                }
            });
        } else {
            requestAiSummary(input.conversationId);
            requestAiDraft(input.conversationId);
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
        if (!workspaceId) return { online: false, theme: null, logoUrl: null, workspaceName: null };
        const workspace = await this.repository.findWorkspace(workspaceId);
        const statuses = await listAgentStatuses(workspaceId);
        const online = statuses.some((s: any) => s.status === 'available' || s.status === 'busy');
        return {
            online,
            theme: workspace?.theme ?? null,
            logoUrl: workspace?.logoUrl ?? null,
            workspaceName: workspace?.name ?? null,
            shortName: workspace?.shortName ?? null,
        };
    }

    async rateConversation(conversationId: string, visitorId: string, rating: number, feedbackOption?: string) {
        const conversation = await this.repository.findConversationSimple(conversationId);
        if (!conversation || conversation.contact?.visitorId !== visitorId) {
            throw new NotFoundException('Conversation not found');
        }

        const updated = await this.repository.updateRating(conversationId, rating, feedbackOption);

        const io = getIoInstance();
        if (io && conversation.workspaceId) {
            io.to(`workspace:${conversation.workspaceId}`).emit('conversation:rated', {
                conversationId,
                rating,
                ratingFeedback: feedbackOption,
            });
        }

        return { ok: true, rating: updated.rating };
    }
}
