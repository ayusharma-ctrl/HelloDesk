import { Annotation } from '@langchain/langgraph';

export interface RetrievedChunk {
    chunkId?: string;
    articleId: string;
    title: string;
    content: string;
    similarity: number;
    tokenCount?: number;
    sourceType?: string;
}

export interface AgentToolCallRecord {
    toolName: string;
    parameters: Record<string, any>;
    result: any;
    latencyMs: number;
    success: boolean;
    executedByAgent?: string;
}

export interface AgentTimelineEntry {
    agent: string;
    action: string;
    timestamp: number;
    details?: any;
}

export interface QaReviewRecord {
    approved: boolean;
    feedback?: string;
    revisedMessage?: string;
    confidenceScore?: number;
    safetyAuditPassed: boolean;
}

/**
 * LangGraph State Annotation schema for the Supervisor-Worker Multi-Agent Architecture
 */
export const MultiAgentStateAnnotation = Annotation.Root({
    workspaceId: Annotation<string>(),
    conversationId: Annotation<string>(),
    channel: Annotation<'chat' | 'email' | 'voice'>({
        reducer: (_, next) => next,
        default: () => 'chat',
    }),
    contactId: Annotation<string | undefined>({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    customerQuery: Annotation<string>(),
    maskedQuery: Annotation<string>(),
    piiReplacements: Annotation<Map<string, string>>({
        reducer: (_, next) => next,
        default: () => new Map(),
    }),
    retrievedContext: Annotation<RetrievedChunk[]>({
        reducer: (_, next) => next,
        default: () => [],
    }),

    // Multi-Agent Execution State
    currentAgent: Annotation<string>({
        reducer: (_, next) => next,
        default: () => 'supervisor',
    }),
    agentRoute: Annotation<'billing' | 'technical' | 'general' | 'handoff'>({
        reducer: (_, next) => next,
        default: () => 'general',
    }),
    supervisorReasoning: Annotation<string>({
        reducer: (_, next) => next,
        default: () => '',
    }),

    // Specialist Worker Outputs
    workerDraftResponse: Annotation<string>({
        reducer: (_, next) => next,
        default: () => '',
    }),
    toolCalls: Annotation<AgentToolCallRecord[]>({
        reducer: (prev, next) => (prev || []).concat(next || []),
        default: () => [],
    }),

    // Supervisor QA Review Output
    qaReview: Annotation<QaReviewRecord | undefined>({
        reducer: (_, next) => next,
        default: () => undefined,
    }),

    // Final Outcome
    finalResponse: Annotation<string | undefined>({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    isHandoffRequested: Annotation<boolean>({
        reducer: (_, next) => next,
        default: () => false,
    }),
    fastPathMatched: Annotation<boolean>({
        reducer: (_, next) => next,
        default: () => false,
    }),

    // Telemetry & Audit Timeline
    agentTimeline: Annotation<AgentTimelineEntry[]>({
        reducer: (prev, next) => (prev || []).concat(next || []),
        default: () => [],
    }),
    tokensUsed: Annotation<number>({
        reducer: (prev, next) => (prev || 0) + (next || 0),
        default: () => 0,
    }),
    iterationCount: Annotation<number>({
        reducer: (prev, next) => (prev || 0) + (next || 0),
        default: () => 0,
    }),
    maxIterations: Annotation<number>({
        reducer: (_, next) => next,
        default: () => 5,
    }),
    tokenBudget: Annotation<number>({
        reducer: (_, next) => next,
        default: () => 4000,
    }),
    startTimeMs: Annotation<number>({
        reducer: (_, next) => next,
        default: () => Date.now(),
    }),
    maxExecutionTimeMs: Annotation<number>({
        reducer: (_, next) => next,
        default: () => 15000,
    }),

    // Workspace Custom LLM Configuration
    llmProvider: Annotation<string | undefined>({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    llmModelName: Annotation<string | undefined>({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    llmApiKey: Annotation<string | undefined>({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    customModelId: Annotation<string | undefined>({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
});

export type MultiAgentStateType = typeof MultiAgentStateAnnotation.State;

// Backward-compatible alias for existing imports
export type AgentState = MultiAgentStateType;
