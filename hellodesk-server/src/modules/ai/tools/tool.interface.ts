import { z } from 'zod';

export type ToolRiskLevel = 'read_only' | 'low_risk' | 'high_risk_mutating';

export interface ToolExecutionContext {
    workspaceId: string;
    conversationId?: string;
    contactId?: string;
    userId?: string;
    traceId: string;
    agentRunId: string;
}

export interface ToolExecutionResult<TOutput = any> {
    success: boolean;
    data?: TOutput;
    error?: string;
    latencyMs: number;
}

export interface AgentTool<TInput = any, TOutput = any> {
    readonly name: string;
    readonly description: string;
    readonly riskLevel: ToolRiskLevel;
    readonly inputSchema: z.ZodType<TInput>;
    readonly outputSchema: z.ZodType<TOutput>;

    execute(context: ToolExecutionContext, input: TInput): Promise<TOutput>;
}
