import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { AgentTool, ToolExecutionContext, ToolRiskLevel } from '../tool.interface.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

const inputSchema = z.object({
    policyType: z.enum(['refund_returns', 'shipping_delivery', 'warranty_support', 'privacy_security', 'general']),
});

const outputSchema = z.object({
    policyName: z.string(),
    content: z.string(),
    summary: z.string(),
    escalationRequired: z.boolean(),
});

type InputType = z.infer<typeof inputSchema>;
type OutputType = z.infer<typeof outputSchema>;

@Injectable()
export class GetWorkspacePolicyTool implements AgentTool<InputType, OutputType> {
    readonly name = 'getWorkspacePolicy';
    readonly description = 'Retrieve official workspace business rules and policies (refunds, warranty, return windows, SLAs).';
    readonly riskLevel: ToolRiskLevel = 'read_only';
    readonly inputSchema = inputSchema;
    readonly outputSchema = outputSchema;

    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async execute(context: ToolExecutionContext, input: InputType): Promise<OutputType> {
        // Look up corresponding article in KB if exists
        const article = await this.prisma.article.findFirst({
            where: {
                workspaceId: context.workspaceId,
                status: 'published',
                OR: [
                    { title: { contains: input.policyType.replace('_', ' '), mode: 'insensitive' } },
                    { slug: { contains: input.policyType.replace('_', '-'), mode: 'insensitive' } }
                ]
            }
        });

        if (article) {
            return {
                policyName: article.title,
                content: article.content,
                summary: article.content.slice(0, 300),
                escalationRequired: input.policyType === 'refund_returns'
            };
        }

        // Standard default baseline policy
        const policies: Record<string, { name: string; content: string; summary: string }> = {
            refund_returns: {
                name: 'Refund & Returns Policy',
                content: 'Customers can request a full return within 30 days of purchase for unopened items. Refunds over $100 require human agent approval.',
                summary: '30-day return window. Refunds over $100 require human escalation.'
            },
            shipping_delivery: {
                name: 'Shipping & Delivery Policy',
                content: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free shipping on orders over $75.',
                summary: 'Standard 3-5 days, express 1-2 days. Free shipping over $75.'
            },
            warranty_support: {
                name: 'Warranty Coverage Policy',
                content: 'Hardware products come with a 1-year limited manufacturer warranty covering hardware defects.',
                summary: '1-year hardware warranty.'
            },
            privacy_security: {
                name: 'Privacy & Security Policy',
                content: 'Customer data is encrypted and never sold. Payment details are processed through PCI-compliant tokenization.',
                summary: 'Encrypted storage and tokenized billing.'
            },
            general: {
                name: 'General Customer Service Terms',
                content: 'HelloDesk support operates 24/7 with automated first response and live human agent business hours from 9 AM to 6 PM EST.',
                summary: '24/7 AI response, live human agents 9 AM - 6 PM EST.'
            }
        };

        const policy = policies[input.policyType] || policies.general;
        return {
            policyName: policy.name,
            content: policy.content,
            summary: policy.summary,
            escalationRequired: input.policyType === 'refund_returns'
        };
    }
}
