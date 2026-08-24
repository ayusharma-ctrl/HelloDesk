import { Injectable } from '@nestjs/common';
import { MultiAgentStateType } from '../agent-state.interface.js';
import { GeminiProvider } from '../../providers/gemini.provider.js';
import { getIoInstance } from '../../../../lib/socket-instance.js';
import { logger } from '../../../../lib/logger.js';

@Injectable()
export class SupervisorNode {
    private geminiProvider = new GeminiProvider();

    async execute(state: MultiAgentStateType): Promise<Partial<MultiAgentStateType>> {
        const io = getIoInstance();
        const start = Date.now();

        logger.info({ conversationId: state.conversationId, workspaceId: state.workspaceId }, 'Supervisor (Triage) evaluating query');

        const supervisorPrompt = `You are the Lead AI Supervisor & Triage Coordinator for HelloDesk AI customer communication platform.
Your job is to analyze the customer query, evaluate intent, and route the inquiry to the single best specialist agent.

Available Specialist Workers:
1. "billing": Handles subscription tiers, pricing, invoices, payment renewal, seat quotas, monthly token limits, upgrade requests, and refund rules.
2. "technical": Handles API endpoints, webhooks, rate limits, uptime/system status, widget embed issues, code snippets, database/pgvector questions, and error codes.
3. "handoff": The customer is extremely frustrated, uses abusive language, or explicitly demands to speak with a human agent/manager.
4. "general": Basic greetings, company introductions, or high-level non-technical FAQs that do not require specialist tools.

Customer Inquiry:
"${state.maskedQuery}"

Respond strictly with a JSON object in this exact schema:
{
  "route": "billing" | "technical" | "general" | "handoff",
  "reasoning": "<brief 1-sentence explanation of why this specialist worker was selected>",
  "directResponse": "<optional draft if route is 'general'>"
}`;

        try {
            const modelName = state.llmModelName || 'gemini-flash-latest';
            const apiKey = state.llmApiKey || process.env.GEMINI_API_KEY;

            const llmResponse = await this.geminiProvider.generate(
                [
                    { role: 'system', content: 'You are an intelligent intent classification supervisor for customer support.' },
                    { role: 'user', content: supervisorPrompt }
                ],
                modelName,
                apiKey,
                { temperature: 0.1, responseFormat: 'json' }
            );

            let parsed: { route: 'billing' | 'technical' | 'general' | 'handoff'; reasoning: string; directResponse?: string } = {
                route: 'general',
                reasoning: 'Defaulted to general inquiry handling.'
            };

            try {
                parsed = JSON.parse(llmResponse.content);
            } catch {
                if (state.maskedQuery.toLowerCase().includes('billing') || state.maskedQuery.toLowerCase().includes('invoice') || state.maskedQuery.toLowerCase().includes('plan')) {
                    parsed.route = 'billing';
                    parsed.reasoning = 'Keyword heuristic matched billing topic.';
                } else if (state.maskedQuery.toLowerCase().includes('api') || state.maskedQuery.toLowerCase().includes('error') || state.maskedQuery.toLowerCase().includes('bug') || state.maskedQuery.toLowerCase().includes('status')) {
                    parsed.route = 'technical';
                    parsed.reasoning = 'Keyword heuristic matched technical topic.';
                }
            }

            const targetAgent = parsed.route === 'billing'
                ? 'Billing Specialist Agent'
                : parsed.route === 'technical'
                ? 'Tech Support Specialist Agent'
                : parsed.route === 'handoff'
                ? 'Human Specialist (Handoff)'
                : 'General Support Worker';

            if (io) {
                io.to(`workspace:${state.workspaceId}`).emit('ai:agent-switched', {
                    conversationId: state.conversationId,
                    from: 'Supervisor (Triage Agent)',
                    to: targetAgent,
                    route: parsed.route,
                    reason: parsed.reasoning,
                    timestamp: Date.now()
                });
            }

            return {
                currentAgent: 'supervisor',
                agentRoute: parsed.route,
                supervisorReasoning: parsed.reasoning,
                workerDraftResponse: parsed.directResponse || '',
                isHandoffRequested: parsed.route === 'handoff',
                tokensUsed: llmResponse.usage.totalTokens,
                agentTimeline: [
                    {
                        agent: 'Supervisor (Triage)',
                        action: `Routed inquiry to ${targetAgent}`,
                        timestamp: Date.now(),
                        details: { route: parsed.route, reasoning: parsed.reasoning, latencyMs: Date.now() - start }
                    }
                ]
            };
        } catch (error: any) {
            logger.error({ error: error.message, conversationId: state.conversationId }, 'Supervisor node execution failed');
            return {
                currentAgent: 'supervisor',
                agentRoute: 'general',
                supervisorReasoning: 'Fallback due to supervisor routing error.',
                agentTimeline: [
                    {
                        agent: 'Supervisor (Triage)',
                        action: 'Fallback routing triggered',
                        timestamp: Date.now(),
                        details: { error: error.message }
                    }
                ]
            };
        }
    }
}
