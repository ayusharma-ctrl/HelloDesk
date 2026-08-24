import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { getIoInstance } from '../../../lib/socket-instance.js';
import { logger } from '../../../lib/logger.js';

@Injectable()
export class HandoffService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async executeHandoff(
        conversationId: string,
        workspaceId: string,
        reason: string,
        summary?: string
    ): Promise<void> {
        logger.info({ conversationId, workspaceId, reason }, 'Executing human handoff');

        // Update conversation status to open and clear any automated state
        const updated = await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: 'open',
                aiSummary: summary ? `[ESCALATED TO HUMAN]: ${summary}` : undefined
            },
            include: { contact: true }
        });

        // Trigger assignment service to find next available agent
        try {
            const assignmentService = await import('../../assignment/assignment.service.js');
            await assignmentService.assignConversation(conversationId, workspaceId);
        } catch (err) {
            logger.warn({ conversationId }, 'Could not run auto-assignment during handoff');
        }

        // Emit realtime events to workspace and visitor
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('agent:handoff-alert', {
                conversationId,
                reason,
                summary,
                conversation: updated
            });

            if (updated.contact?.visitorId) {
                io.to(`visitor:${updated.contact.visitorId}`).emit('ai:handoff-occurred', {
                    conversationId,
                    message: 'I am connecting you with a human support agent now. Please hold on!'
                });
            }
        }
    }
}
