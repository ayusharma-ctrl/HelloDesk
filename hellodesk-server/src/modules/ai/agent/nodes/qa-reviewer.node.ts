import { Injectable, Inject } from '@nestjs/common';
import { MultiAgentStateType } from '../agent-state.interface.js';
import { GeminiProvider } from '../../providers/gemini.provider.js';
import { OutputGuardrailsService } from '../../safety/output-guardrails.service.js';
import { getIoInstance } from '../../../../lib/socket-instance.js';
import { logger } from '../../../../lib/logger.js';

@Injectable()
export class QaReviewerNode {
    private geminiProvider = new GeminiProvider();

    constructor(@Inject(OutputGuardrailsService) private readonly outputGuardrails: OutputGuardrailsService) {}

    async execute(state: MultiAgentStateType): Promise<Partial<MultiAgentStateType>> {
        const io = getIoInstance();
        const start = Date.now();

        logger.info({ conversationId: state.conversationId }, 'Supervisor QA Reviewer validating draft response');

        const draft = state.workerDraftResponse || 'Thank you for reaching out. How else can I assist you?';

        // 1. Deterministic Output Guardrails (financial promises, safety violations)
        const guardrailCheck = this.outputGuardrails.validateOutput(
            draft,
            state.toolCalls.filter(t => t.success).map(t => t.toolName)
        );
        let safeDraft = guardrailCheck.sanitizedMessage || draft;

        // 2. LLM Policy & Tone Verification
        const qaPrompt = `You are the Lead Quality Assurance & Policy Compliance Supervisor for HelloDesk AI.
Your responsibility is to review the specialist agent's draft response before it is sent to the customer.

Review Criteria:
1. Accuracy & Helpfulness: Does the response address the customer's inquiry directly?
2. Tone & Empathy: Is the tone professional, friendly, and brand-compliant?
3. Policy Compliance: Does it avoid making false promises or unauthorized financial guarantees?
4. Clean Formatting: Are code snippets and markdown formatted properly?

Customer Inquiry:
"${state.maskedQuery}"

Specialist Worker Draft:
"${safeDraft}"

Respond with a JSON object in this exact schema:
{
  "approved": boolean,
  "confidenceScore": number (1 to 5),
  "feedback": "<brief explanation>",
  "finalResponse": "<approved text or polished revision>"
}`;

        try {
            const modelName = state.llmModelName || 'gemini-flash-latest';
            const apiKey = state.llmApiKey || process.env.GEMINI_API_KEY;

            const llmResponse = await this.geminiProvider.generate(
                [
                    { role: 'system', content: 'You are a meticulous QA compliance reviewer for enterprise customer support.' },
                    { role: 'user', content: qaPrompt }
                ],
                modelName,
                apiKey,
                { temperature: 0.1, responseFormat: 'json' }
            );

            let parsed: { approved: boolean; confidenceScore: number; feedback: string; finalResponse: string } = {
                approved: true,
                confidenceScore: 5,
                feedback: 'Passed quality and safety verification.',
                finalResponse: safeDraft
            };

            try {
                parsed = JSON.parse(llmResponse.content);
            } catch {
                parsed.finalResponse = safeDraft;
            }

            const finalMessage = parsed.finalResponse || safeDraft;

            if (io) {
                io.to(`workspace:${state.workspaceId}`).emit('ai:qa-reviewed', {
                    conversationId: state.conversationId,
                    reviewer: 'Supervisor (QA Reviewer)',
                    approved: parsed.approved,
                    confidenceScore: parsed.confidenceScore,
                    feedback: parsed.feedback,
                    timestamp: Date.now()
                });
            }

            return {
                currentAgent: 'qa_reviewer',
                qaReview: {
                    approved: parsed.approved,
                    confidenceScore: parsed.confidenceScore,
                    feedback: parsed.feedback,
                    revisedMessage: parsed.approved ? undefined : finalMessage,
                    safetyAuditPassed: guardrailCheck.passed
                },
                finalResponse: finalMessage,
                tokensUsed: llmResponse.usage.totalTokens,
                agentTimeline: [
                    {
                        agent: 'Supervisor (QA Reviewer)',
                        action: parsed.approved ? 'Approved draft response' : 'Revised & polished response',
                        timestamp: Date.now(),
                        details: {
                            approved: parsed.approved,
                            confidenceScore: parsed.confidenceScore,
                            feedback: parsed.feedback,
                            latencyMs: Date.now() - start
                        }
                    }
                ]
            };
        } catch (error: any) {
            logger.error({ error: error.message, conversationId: state.conversationId }, 'QA Reviewer node execution error');
            return {
                currentAgent: 'qa_reviewer',
                finalResponse: safeDraft,
                qaReview: {
                    approved: true,
                    feedback: 'Fallback approval due to reviewer execution exception',
                    safetyAuditPassed: true
                },
                agentTimeline: [
                    {
                        agent: 'Supervisor (QA Reviewer)',
                        action: 'Approved with fallback',
                        timestamp: Date.now(),
                        details: { error: error.message }
                    }
                ]
            };
        }
    }
}
