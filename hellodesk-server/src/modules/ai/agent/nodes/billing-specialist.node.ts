import { Injectable, Inject } from '@nestjs/common';
import { MultiAgentStateType, AgentToolCallRecord } from '../agent-state.interface.js';
import { ToolRegistryService } from '../../tools/tool-registry.service.js';
import { GeminiProvider } from '../../providers/gemini.provider.js';
import { getIoInstance } from '../../../../lib/socket-instance.js';
import { logger } from '../../../../lib/logger.js';

@Injectable()
export class BillingSpecialistNode {
    private geminiProvider = new GeminiProvider();

    constructor(@Inject(ToolRegistryService) private readonly toolRegistry: ToolRegistryService) {}

    async execute(state: MultiAgentStateType): Promise<Partial<MultiAgentStateType>> {
        const io = getIoInstance();
        const start = Date.now();
        let tokensAccumulated = 0;
        const newToolCalls: AgentToolCallRecord[] = [];

        logger.info({ conversationId: state.conversationId }, 'Billing Specialist Worker processing query');

        const systemPrompt = `You are the specialized Billing & Accounts AI Specialist for HelloDesk.
Your domain expertise includes:
- Subscription plans & upgrades (FREE, GROWTH: $99/mo, ENTERPRISE: $499/mo).
- Invoice lookups, billing receipts, and payment renewal dates.
- Monthly token quotas, usage tracking, and seat allowances.
- Refund policies and billing dispute resolutions.

Available Tools for your use:
- get_billing_info: Call this to inspect current plan tier, seat allocations, monthly token allowance, and recent invoices.
- get_workspace_policy: Call this to check refund eligibility rules and terms.
- search_kb: Call this to query knowledge base articles for billing procedures.
- assign_to_human: Call this if a sensitive manual refund approval or card dispute is required.

Decision Protocol:
If you need live account or billing data, call a tool first.
Format response as JSON:
{"action": "tool_call", "toolName": "<name>", "parameters": {}}
OR when ready with your answer:
{"action": "final_response", "message": "<your polite, professional breakdown>"}`;

        let currentIteration = 0;
        const maxWorkerIterations = 3;
        let draftMessage = '';

        while (currentIteration < maxWorkerIterations) {
            currentIteration++;

            const toolHistory = newToolCalls
                .map(tc => `Tool: ${tc.toolName}\nParams: ${JSON.stringify(tc.parameters)}\nResult: ${JSON.stringify(tc.result)}`)
                .join('\n\n');

            const userPrompt = `Customer Inquiry:
${state.maskedQuery}

Supervisor Routing Note:
${state.supervisorReasoning}

${toolHistory ? `<executed_tools>\n${toolHistory}\n</executed_tools>` : ''}

Decide your next action.`;

            const modelName = state.llmModelName || 'gemini-flash-latest';
            const apiKey = state.llmApiKey || process.env.GEMINI_API_KEY;

            const llmResponse = await this.geminiProvider.generate(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                modelName,
                apiKey,
                { temperature: 0.1, responseFormat: 'json' }
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
                        agent: 'Billing Specialist',
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
                    executedByAgent: 'Billing Specialist'
                });
            } else {
                draftMessage = parsed.message || llmResponse.content;
                break;
            }
        }

        return {
            currentAgent: 'billing_specialist',
            workerDraftResponse: draftMessage,
            toolCalls: newToolCalls,
            tokensUsed: tokensAccumulated,
            iterationCount: currentIteration,
            agentTimeline: [
                {
                    agent: 'Billing Specialist',
                    action: `Drafted billing response (${newToolCalls.length} tool(s) used)`,
                    timestamp: Date.now(),
                    details: { latencyMs: Date.now() - start, toolCount: newToolCalls.length }
                }
            ]
        };
    }
}
