import crypto from 'crypto';

export interface TraceSpan {
    spanId: string;
    parentSpanId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    attributes: Record<string, any>;
    status: 'ok' | 'error';
    errorMessage?: string;
}

export class TraceContext {
    public readonly traceId: string;
    public readonly workspaceId: string;
    public readonly conversationId?: string;
    public readonly agentRunId: string;
    public readonly spans: TraceSpan[] = [];
    public readonly startTime: number;

    constructor(workspaceId: string, conversationId?: string, traceId?: string, agentRunId?: string) {
        this.workspaceId = workspaceId;
        this.conversationId = conversationId;
        this.traceId = traceId || crypto.randomUUID();
        this.agentRunId = agentRunId || crypto.randomUUID();
        this.startTime = Date.now();
    }

    startSpan(name: string, attributes: Record<string, any> = {}, parentSpanId?: string): string {
        const spanId = crypto.randomUUID().slice(0, 8);
        this.spans.push({
            spanId,
            parentSpanId,
            name,
            startTime: Date.now(),
            attributes,
            status: 'ok'
        });
        return spanId;
    }

    endSpan(spanId: string, attributes?: Record<string, any>, error?: Error): void {
        const span = this.spans.find(s => s.spanId === spanId);
        if (!span) return;

        span.endTime = Date.now();
        span.durationMs = span.endTime - span.startTime;
        if (attributes) {
            span.attributes = { ...span.attributes, ...attributes };
        }
        if (error) {
            span.status = 'error';
            span.errorMessage = error.message;
        }
    }

    toSummary() {
        return {
            traceId: this.traceId,
            workspaceId: this.workspaceId,
            conversationId: this.conversationId,
            agentRunId: this.agentRunId,
            totalDurationMs: Date.now() - this.startTime,
            spanCount: this.spans.length,
            spans: this.spans
        };
    }
}
