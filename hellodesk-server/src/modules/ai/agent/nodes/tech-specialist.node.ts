import { Injectable, Inject } from '@nestjs/common';
import { MultiAgentStateType, AgentToolCallRecord } from '../agent-state.interface.js';
import { ToolRegistryService } from '../../tools/tool-registry.service.js';
import { GeminiProvider } from '../../providers/gemini.provider.js';
import { getIoInstance } from '../../../../lib/socket-instance.js';
import { logger } from '../../../../lib/logger.js';

@Injectable()
export class TechSpecialistNode {
    private geminiProvider = new GeminiProvider();

    constructor(@Inject(ToolRegistryService) private readonly toolRegistry: ToolRegistryService) {}

    async execute(state: MultiAgentStateType): Promise<Partial<MultiAgentStateType>> {
        const io = getIoInstance();
        const start = Date.now();
        let tokensAccumulated = 0;
        const newToolCalls: AgentToolCallRecord[] = [];

        logger.info({ conversationId: state.conversationId }, 'Tech Support Specialist Worker processing query');

        const systemPrompt = `You are the specialized Senior Technical Support AI Specialist for HelloDesk.
Your domain expertise includes:
- REST API integration, HTTP status codes (200, 401, 403, 429, 500), and rate limits.
- Real-time WebSockets, streaming events, and Socket.io gateway integration.
- Widget embedding (HTML script tags, React/Next.js/Vue component integration).
- Platform service uptime, database latency, and system incident diagnostics.
- Code snippets, SDK debugging, and step-by-step developer troubleshooting.

Available Tools for your use:
- check_system_status: Call this to inspect API uptime, Redis queues, database latency, and incident reports.
- search_kb: Call this to query technical documentation, API guides, and knowledge base articles.
- get_customer_profile: Call this to verify user identity, role, and workspace authorization.
- assign_to_human: Call this if an engineering escalation or private database fix is required.

Decision Protocol:
If live diagnostic or documentation data is needed, call a tool first.
Format response as JSON:
{"action": "tool_call", "toolName": "<name>", "parameters": {}}
OR when ready with your answer:
{"action": "final_response", "message": "<your technical breakdown with markdown/code blocks>"}`;

        let currentIteration = 0;
        const maxWorkerIterations = 3;
        let draftMessage = '';

        while (currentIteration < maxWorkerIterations) {
            currentIteration++;

            const toolHistory = newToolCalls
                .map(tc => `Tool: ${tc.toolName}\nParams: ${JSON.stringify(tc.parameters)}\nResult: ${JSON.stringify(tc.result)}`)
                .join('\n\n');

            const userPrompt = `Customer Technical Inquiry:
${state.maskedQuery}

Supervisor Routing Note:
${state.supervisorReasoning}

${toolHistory ? `<executed_tools>\n${toolHistory}\n</executed_tools>` : ''}

Decide your next technical action.`;

            const modelName = state.llmModelName || 'gemini-flash-latest';
            const apiKey = state.llmApiKey || process.env.GEMINI_API_KEY;

            const llmResponse = await this.geminiProvider.generate(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                modelName,
                apiKey,
                { temperature: 0.15, responseFormat: 'json' }
            );

            tokensAccumulated += llmResponse.usage.totalTokens;

            let parsed: any = null;
            try {
                parsed = JSON.parse(llmResponse.content);
            } catch {
                draftMessage = llmResponse.content;
                break;
            }

            if (parsed?.action === 'final_response' || parsed?.message) {
                draftMessage = parsed.message || llmResponse.content;
                break;
            }

            if (parsed?.action === 'tool_call' && parsed?.toolName) {
                const toolName = parsed.toolName;
                const toolParams = parsed.parameters || {};

                if (io) {
                    io.to(`workspace:${state.workspaceId}`).emit('ai:tool-started', {
                        conversationId: state.conversationId,
                        agent: 'Tech Support Specialist',
                        toolName,
                        parameters: toolParams
                    });
                }

                const toolResult = await this.toolRegistry.executeTool(
                    toolName,
                    {
                        workspaceId: state.workspaceId,
                        conversationId: state.conversationId,
                        contactId: state.contactId,
                        traceId: `trace-${Date.now()}`,
                        agentRunId: `agent-run-${Date.now()}`
                    },
                    toolParams
                );

                newToolCalls.push({
                    toolName,
                    parameters: toolParams,
                    result: toolResult.data || toolResult.error,
                    latencyMs: toolResult.latencyMs,
                    success: toolResult.success,
                    executedByAgent: 'Tech Support Specialist'
                });
            } else {
                draftMessage = parsed.message || llmResponse.content;
                break;
            }
        }

        return {
            currentAgent: 'tech_specialist',
            workerDraftResponse: draftMessage,
            toolCalls: newToolCalls,
            tokensUsed: tokensAccumulated,
            iterationCount: currentIteration,
            agentTimeline: [
                {
                    agent: 'Tech Support Specialist',
                    action: `Drafted technical response (${newToolCalls.length} tool(s) used)`,
                    timestamp: Date.now(),
                    details: { latencyMs: Date.now() - start, toolCount: newToolCalls.length }
                }
            ]
        };
    }
}
