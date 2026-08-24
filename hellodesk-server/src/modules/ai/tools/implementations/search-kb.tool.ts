import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { AgentTool, ToolExecutionContext, ToolRiskLevel } from '../tool.interface.js';
import { HybridRetrieverService } from '../../retrieval/hybrid-retriever.service.js';

const inputSchema = z.object({
    query: z.string().min(2, 'Search query must be at least 2 characters'),
    topK: z.number().int().min(1).max(6).default(3),
});

const outputSchema = z.object({
    results: z.array(z.object({
        title: z.string(),
        content: z.string(),
        similarity: z.number(),
    })),
    confidence: z.number(),
    hasExactMatch: z.boolean(),
});

type InputType = z.input<typeof inputSchema>;
type OutputType = z.infer<typeof outputSchema>;

@Injectable()
export class SearchKbTool implements AgentTool<InputType, OutputType> {
    readonly name = 'searchKnowledgeBase';
    readonly description = 'Search the workspace knowledge base articles for help documentation, FAQs, and product policies.';
    readonly riskLevel: ToolRiskLevel = 'read_only';
    readonly inputSchema = inputSchema as any;
    readonly outputSchema = outputSchema as any;

    constructor(@Inject(HybridRetrieverService) private readonly hybridRetriever: HybridRetrieverService) {}

    async execute(context: ToolExecutionContext, input: InputType): Promise<OutputType> {
        const result = await this.hybridRetriever.retrieve(context.workspaceId, input.query, input.topK ?? 3);

        return {
            results: result.chunks.map(c => ({
                title: c.title,
                content: c.content,
                similarity: c.similarity
            })),
            confidence: result.evaluation.confidence,
            hasExactMatch: result.evaluation.isExactMatch
        };
    }
}
