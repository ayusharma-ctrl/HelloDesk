import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { AgentTool, ToolExecutionContext, ToolRiskLevel } from '../tool.interface.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { listAgentStatuses } from '../../../../lib/redis.js';
import { getIoInstance } from '../../../../lib/socket-instance.js';
import * as assignmentService from '../../../assignment/assignment.service.js';

const inputSchema = z.object({
    reason: z.string().min(3, 'Handoff reason is required'),
    summary: z.string().optional().default('Customer inquiry requires specialized agent attention.'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal')
});

const outputSchema = z.object({
    assigned: z.boolean(),
    agentName: z.string().nullable(),
    queueStatus: z.enum(['assigned', 'queued', 'offline_fallback']),
    message: z.string(),
});

type InputType = z.input<typeof inputSchema>;
type OutputType = z.infer<typeof outputSchema>;

@Injectable()
export class AssignToHumanAgentTool implements AgentTool<InputType, OutputType> {
    readonly name = 'assignToHumanAgent';
    readonly description = 'Escalate and transfer conversation to an online human support agent. Use only when autonomous AI cannot resolve the request, tools fail, or the customer explicitly demands a human specialist.';
    readonly riskLevel: ToolRiskLevel = 'low_risk';
    readonly inputSchema = inputSchema as any;
    readonly outputSchema = outputSchema as any;

    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async execute(context: ToolExecutionContext, input: InputType): Promise<OutputType> {
        const statuses = await listAgentStatuses(context.workspaceId);
        const onlineAgents = statuses.filter((s: any) => s.status === 'available' || s.status === 'busy');

        const io = getIoInstance();

        if (onlineAgents.length === 0) {
            // No online agents: prompt for query and establish 24hr SLA
            return {
                assigned: false,
                agentName: null,
                queueStatus: 'offline_fallback',
                message: 'All human support specialists are currently offline. Our team has received your message and will follow up with you via email within 24 hours.'
            };
        }

        // Attempt automated round-robin / least busy assignment
        let assignedAgentName: string | null = null;
        if (context.conversationId) {
            await assignmentService.assignConversation(context.conversationId, context.workspaceId);

            const conv = await this.prisma.conversation.findUnique({
                where: { id: context.conversationId },
                include: { assignee: true }
            });

            if (conv?.assignee) {
                assignedAgentName = conv.assignee.name;
            }

            if (io) {
                io.to(`workspace:${context.workspaceId}`).emit('agent:handoff-alert', {
                    conversationId: context.conversationId,
                    reason: input.reason,
                    summary: input.summary,
                    priority: input.priority,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return {
            assigned: true,
            agentName: assignedAgentName,
            queueStatus: assignedAgentName ? 'assigned' : 'queued',
            message: assignedAgentName
                ? `I have connected you with ${assignedAgentName} who is reviewing your ticket right now.`
                : 'I have transferred your conversation to our priority support queue. An agent will be with you shortly.'
        };
    }
}
