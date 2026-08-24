import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { AgentTool, ToolExecutionContext, ToolRiskLevel } from '../tool.interface.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

const inputSchema = z.object({
    email: z.string().email().optional(),
    visitorId: z.string().optional(),
});

const outputSchema = z.object({
    contactFound: z.boolean(),
    contact: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        totalConversations: z.number(),
        createdAt: z.string(),
        memories: z.array(z.object({
            key: z.string(),
            value: z.string()
        }))
    }).nullable()
});

type InputType = z.infer<typeof inputSchema>;
type OutputType = z.infer<typeof outputSchema>;

@Injectable()
export class GetCustomerProfileTool implements AgentTool<InputType, OutputType> {
    readonly name = 'getCustomerProfile';
    readonly description = 'Look up customer profile information, contact history, and saved customer preferences/facts.';
    readonly riskLevel: ToolRiskLevel = 'read_only';
    readonly inputSchema = inputSchema;
    readonly outputSchema = outputSchema;

    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async execute(context: ToolExecutionContext, input: InputType): Promise<OutputType> {
        let contact = null;

        if (input.email) {
            contact = await this.prisma.contact.findFirst({
                where: { workspaceId: context.workspaceId, email: input.email },
                include: {
                    conversations: { select: { id: true } },
                    memories: true
                }
            });
        } else if (input.visitorId) {
            contact = await this.prisma.contact.findFirst({
                where: { workspaceId: context.workspaceId, visitorId: input.visitorId },
                include: {
                    conversations: { select: { id: true } },
                    memories: true
                }
            });
        } else if (context.contactId) {
            contact = await this.prisma.contact.findUnique({
                where: { id: context.contactId },
                include: {
                    conversations: { select: { id: true } },
                    memories: true
                }
            });
        }

        if (!contact) {
            return { contactFound: false, contact: null };
        }

        return {
            contactFound: true,
            contact: {
                name: contact.name,
                email: contact.email,
                totalConversations: contact.conversations.length,
                createdAt: contact.createdAt.toISOString(),
                memories: (contact.memories || []).map((m: any) => ({
                    key: m.factKey,
                    value: m.factValue
                }))
            }
        };
    }
}
