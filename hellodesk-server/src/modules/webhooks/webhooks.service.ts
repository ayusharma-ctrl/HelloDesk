import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { WebhooksRepository } from './webhooks.repository.js';
import type { ResendInboundPayload } from './webhooks.types.js';
import * as assignmentService from '../assignment/assignment.service.js';
import { requestAiSummary, requestAiDraft } from '../../services/ai.worker.js';
import { AgentRuntimeService } from '../ai/agent/agent-runtime.service.js';
import { logger } from '../../lib/logger.js';

@Injectable()
export class WebhooksService {
    constructor(
        @Inject(WebhooksRepository) private readonly repository: WebhooksRepository,
        @Optional() @Inject(AgentRuntimeService) private readonly agentRuntime?: AgentRuntimeService
    ) {}

    async processInboundEmail(workspaceId: string, payload: ResendInboundPayload) {
        const workspace = await this.repository.findWorkspace(workspaceId);
        if (!workspace || !workspace.isActive) {
            throw new NotFoundException('Workspace not found');
        }

        const senderEmail = payload.from ?? '';
        const body = payload.text ?? payload.html ?? '';
        const inboundMessageId = payload.headers?.['message-id'];
        const inReplyTo = payload.headers?.['in-reply-to'];
        const references = payload.headers?.references;

        const threadCandidates = [inReplyTo, references].filter((v): v is string => Boolean(v));
        let conversation = null;

        if (threadCandidates.length > 0) {
            conversation = await this.repository.findThreadConversation(workspaceId, threadCandidates);
        }

        let contact = await this.repository.findContactByEmail(workspaceId, senderEmail);
        if (!contact) {
            contact = await this.repository.createContact(workspaceId, senderEmail, senderEmail);
        }

        let isNew = false;
        if (!conversation) {
            conversation = await this.repository.createConversation(workspaceId, contact.id);
            isNew = true;
        }

        const message = await this.repository.createMessage({
            conversationId: conversation.id,
            senderType: 'contact',
            body,
            emailMessageId: inboundMessageId,
            emailInReplyTo: inReplyTo ?? references ?? undefined,
        });

        await this.repository.updateConversationOnInbound(conversation.id, contact.id, message.id, isNew);

        if (isNew) {
            await assignmentService.assignConversation(conversation.id, workspaceId);
        }

        // Autonomous Email Agent execution when no agent is assigned and workspace has AI enabled
        if (!conversation.assigneeId && workspace.aiEnabled && this.agentRuntime && body) {
            setImmediate(async () => {
                try {
                    await this.agentRuntime?.runAgent(
                        workspaceId,
                        conversation!.id,
                        body,
                        'email'
                    );
                } catch (err) {
                    requestAiSummary(conversation!.id);
                    requestAiDraft(conversation!.id);
                }
            });
        } else {
            requestAiSummary(conversation.id);
            requestAiDraft(conversation.id);
        }

        logger.info({ conversationId: conversation.id, isNew, senderEmail }, 'Inbound email processed');

        return { conversationId: conversation.id, message };
    }
}
