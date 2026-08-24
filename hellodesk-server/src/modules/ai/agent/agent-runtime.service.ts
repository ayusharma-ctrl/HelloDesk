import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { HybridRetrieverService } from '../retrieval/hybrid-retriever.service.js';
import { PiiMaskerService } from '../safety/pii-masker.service.js';
import { InjectionDetectorService } from '../safety/injection-detector.service.js';
import { MultiAgentGraphBuilder } from './multi-agent-graph.builder.js';
import { MultiAgentStateType } from './agent-state.interface.js';
import { TraceContext } from '../context/trace-context.js';
import { getIoInstance } from '../../../lib/socket-instance.js';
import { logger } from '../../../lib/logger.js';

@Injectable()
export class AgentRuntimeService {
    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
        @Inject(HybridRetrieverService) private readonly hybridRetriever: HybridRetrieverService,
        @Inject(PiiMaskerService) private readonly piiMasker: PiiMaskerService,
        @Inject(InjectionDetectorService) private readonly injectionDetector: InjectionDetectorService,
        @Inject(MultiAgentGraphBuilder) private readonly graphBuilder: MultiAgentGraphBuilder
    ) {}

    /**
     * Execute customer inquiry through the LangGraph Supervisor-Worker Multi-Agent Architecture
     */
    async runAgent(
        workspaceId: string,
        conversationId: string,
        userMessageText: string,
        channel: 'chat' | 'email' | 'voice' = 'chat'
    ): Promise<MultiAgentStateType> {
        const trace = new TraceContext(workspaceId, conversationId);
        const rootSpan = trace.startSpan('multi_agent.run', { channel, length: userMessageText.length });

        // Initialize Base State
        let state: MultiAgentStateType = {
            workspaceId,
            conversationId,
            channel,
            contactId: undefined,
            customerQuery: userMessageText,
            maskedQuery: userMessageText,
            piiReplacements: new Map(),
            retrievedContext: [],
            currentAgent: 'supervisor',
            agentRoute: 'general',
            supervisorReasoning: '',
            workerDraftResponse: '',
            toolCalls: [],
            qaReview: undefined,
            finalResponse: undefined,
            isHandoffRequested: false,
            fastPathMatched: false,
            agentTimeline: [],
            tokensUsed: 0,
            iterationCount: 0,
            maxIterations: 5,
            tokenBudget: 4000,
            startTimeMs: Date.now(),
            maxExecutionTimeMs: 15000,
            llmProvider: 'google',
            llmModelName: 'gemini-3.6-flash',
            llmApiKey: process.env.GEMINI_API_KEY || '',
            customModelId: undefined
        };

        // STEP 0: Check Conversation & Abort if Resolved
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { contact: true }
        });

        if (!conversation || conversation.status === 'resolved') {
            logger.info({ conversationId, status: conversation?.status }, 'Agent run aborted: conversation is missing or resolved');
            trace.endSpan(rootSpan, { aborted: true, reason: 'resolved' });
            return state;
        }

        if (conversation.contactId) {
            state.contactId = conversation.contactId;
        }

        // STEP 0.5: Resolve Workspace Custom LLM Model
        try {
            const candidateModels = await this.prisma.llmModel.findMany({
                where: { workspaceId, status: { not: 'invalid_key' } },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            });

            if (candidateModels.length > 0) {
                const customModel = candidateModels[0];
                state.llmProvider = customModel.provider;
                state.llmModelName = customModel.modelName || 'gemini-3.6-flash';
                state.llmApiKey = customModel.apiKey;
                state.customModelId = customModel.id;
                logger.info({ workspaceId, model: customModel.modelName, customModelId: customModel.id }, 'Using workspace custom LLM model for multi-agent mesh');
            } else {
                state.llmProvider = 'google';
                state.llmModelName = 'gemini-3.6-flash';
                state.llmApiKey = process.env.GEMINI_API_KEY || '';
            }
        } catch (err) {
            logger.warn({ err, workspaceId }, 'Error looking up workspace custom LLM model, falling back to system key');
        }

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('ai:response-started', {
                conversationId,
                traceId: trace.traceId,
                agentTopology: 'Supervisor-Worker Mesh (LangGraph)'
            });
            if (conversation.contact?.visitorId) {
                io.to(`visitor:${conversation.contact.visitorId}`).emit('ai:response-started', {
                    conversationId,
                    traceId: trace.traceId
                });
            }
        }

        // STEP 1: Injection Pre-flight Guardrail Check
        const injectionSpan = trace.startSpan('safety.injection_check', {}, rootSpan);
        const injectionCheck = this.injectionDetector.check(userMessageText);
        trace.endSpan(injectionSpan, { isSafe: injectionCheck.isSafe });

        if (!injectionCheck.isSafe) {
            state.finalResponse = "I'm sorry, but I cannot process requests that attempt to modify system instructions. How else can I assist you today?";
            state.agentTimeline.push({
                agent: 'Safety Guardrail',
                action: 'Blocked injection attempt',
                timestamp: Date.now()
            });
            await this.finalizeAgentRun(state, trace, rootSpan);
            return state;
        }

        // STEP 2: PII Masking
        const piiSpan = trace.startSpan('safety.pii_mask', {}, rootSpan);
        const piiResult = this.piiMasker.mask(userMessageText);
        state.maskedQuery = piiResult.maskedText;
        state.piiReplacements = piiResult.replacements;
        trace.endSpan(piiSpan, { hasPii: piiResult.hasPii, maskedCount: piiResult.maskedCount });

        // STEP 3: Hybrid Retrieval & Fast-Path (0-Token) Cache Bypass
        const retrievalSpan = trace.startSpan('retrieval.hybrid', {}, rootSpan);
        const searchResult = await this.hybridRetriever.retrieve(workspaceId, state.maskedQuery, 3);
        state.retrievedContext = searchResult.chunks;
        trace.endSpan(retrievalSpan, {
            chunksFound: searchResult.chunks.length,
            confidence: searchResult.evaluation.confidence,
            fastPathEligible: searchResult.fastPathEligible
        });

        // Fast-path bypass
        if (searchResult.fastPathEligible && searchResult.fastPathSnippet) {
            state.fastPathMatched = true;
            state.finalResponse = `${searchResult.fastPathSnippet}\n\n*(Source: [${searchResult.fastPathArticle?.title || 'Knowledge Base'}](/kb/article/${searchResult.fastPathArticle?.slug}))*`;
            state.agentTimeline.push({
                agent: 'Fast-Path Retriever',
                action: 'Bypassed LLM loop with verified knowledge chunk',
                timestamp: Date.now()
            });
            await this.finalizeAgentRun(state, trace, rootSpan);
            return state;
        }

        // STEP 4: Execute LangGraph Multi-Agent StateGraph
        const multiAgentSpan = trace.startSpan('langgraph.multi_agent_execution', {}, rootSpan);
        try {
            const graph = this.graphBuilder.getGraph();
            const graphOutput: MultiAgentStateType = await graph.invoke(state);

            state = {
                ...state,
                ...graphOutput,
                toolCalls: graphOutput.toolCalls || state.toolCalls,
                agentTimeline: graphOutput.agentTimeline || state.agentTimeline,
                tokensUsed: graphOutput.tokensUsed || state.tokensUsed,
                finalResponse: graphOutput.finalResponse || state.finalResponse
            };

            trace.endSpan(multiAgentSpan, {
                route: state.agentRoute,
                toolsCalled: state.toolCalls.length,
                qaApproved: state.qaReview?.approved
            });
        } catch (graphError: any) {
            logger.error({ error: graphError.message, conversationId }, 'LangGraph Multi-Agent execution failed; applying graceful fallback');
            trace.endSpan(multiAgentSpan, { error: graphError.message });

            // If custom model hit rate limit, update its status
            if (state.customModelId && (
                graphError.message?.includes('429') ||
                graphError.message?.includes('Quota exceeded') ||
                graphError.message?.includes('RESOURCE_EXHAUSTED') ||
                graphError.message?.includes('limit')
            )) {
                try {
                    await this.prisma.llmModel.update({
                        where: { id: state.customModelId },
                        data: {
                            status: 'rate_limited',
                            rateLimitResetAt: new Date(Date.now() + 60 * 1000)
                        }
                    });
                } catch (e) {}
            }

            // Fallback: If we have retrieved KB chunks, answer with the top knowledge chunk
            if (state.retrievedContext && state.retrievedContext.length > 0 && !state.finalResponse) {
                const topChunk = state.retrievedContext[0];
                state.finalResponse = `${topChunk.content}\n\n*(Source: [Knowledge Base](/kb))*`;
            } else if (!state.finalResponse) {
                state.finalResponse = "Thank you for reaching out. Our automated AI specialists are currently experiencing high request volume. I've routed your inquiry to our live support team.";
                state.isHandoffRequested = true;
            }
        }

        // STEP 5: Unmask any PII before customer delivery
        if (state.finalResponse) {
            state.finalResponse = this.piiMasker.unmask(state.finalResponse, state.piiReplacements);
        }

        await this.finalizeAgentRun(state, trace, rootSpan);
        return state;
    }

    private async finalizeAgentRun(state: MultiAgentStateType, trace: TraceContext, rootSpan: string): Promise<void> {
        trace.endSpan(rootSpan, { tokensUsed: state.tokensUsed, iterations: state.iterationCount });

        // Double check conversation status before creating messages
        const currentConv = await this.prisma.conversation.findUnique({
            where: { id: state.conversationId },
            include: { contact: true }
        });

        if (currentConv?.status === 'resolved') {
            logger.info({ conversationId: state.conversationId }, 'Skip message persistence: conversation is resolved');
            return;
        }

        const bodyContent = state.finalResponse || 'Thank you for reaching out. How else can I assist you?';

        // 1. Create Bot Message in Database & Mark Contact Messages as Read/Seen
        const message = await this.prisma.message.create({
            data: {
                conversationId: state.conversationId,
                senderType: 'bot',
                body: bodyContent,
                isAiDraft: false
            }
        });

        // Mark previous contact messages as seen by AI
        await this.prisma.message.updateMany({
            where: {
                conversationId: state.conversationId,
                senderType: 'contact',
                readAt: null
            },
            data: {
                readAt: new Date()
            }
        });

        await this.prisma.conversation.update({
            where: { id: state.conversationId },
            data: {
                lastMessageId: message.id,
                tokensUsed: { increment: state.tokensUsed }
            }
        });

        // Update custom LLM token usage in database
        if (state.customModelId && state.tokensUsed > 0) {
            try {
                await this.prisma.llmModel.update({
                    where: { id: state.customModelId },
                    data: {
                        status: 'verified',
                        totalTokensUsed: { increment: state.tokensUsed }
                    }
                });
            } catch (err) {
                logger.warn({ err, customModelId: state.customModelId }, 'Failed to record custom model token usage');
            }
        }

        // 2. Emit Real-time Multi-Agent Telemetry Events
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${state.workspaceId}`).emit('message:created', {
                conversationId: state.conversationId,
                message
            });

            io.to(`workspace:${state.workspaceId}`).emit('ai:response-completed', {
                conversationId: state.conversationId,
                response: bodyContent,
                tokensUsed: state.tokensUsed,
                fastPath: state.fastPathMatched,
                agentRoute: state.agentRoute,
                currentAgent: state.currentAgent,
                qaReview: state.qaReview,
                toolCalls: state.toolCalls,
                agentTimeline: state.agentTimeline,
                trace: trace.toSummary()
            });

            if (currentConv?.contact?.visitorId) {
                io.to(`visitor:${currentConv.contact.visitorId}`).emit('message:created', {
                    conversationId: state.conversationId,
                    message
                });
                io.to(`visitor:${currentConv.contact.visitorId}`).emit('ai:response-completed', {
                    conversationId: state.conversationId
                });
                io.to(`visitor:${currentConv.contact.visitorId}`).emit('messages:read', {
                    conversationId: state.conversationId,
                    readAt: new Date().toISOString()
                });
            }
        }

        // 3. Persist AgentRun Record in DB
        try {
            await this.prisma.agentRun.create({
                data: {
                    id: trace.agentRunId,
                    workspaceId: state.workspaceId,
                    conversationId: state.conversationId,
                    traceId: trace.traceId,
                    channel: state.channel,
                    status: state.isHandoffRequested ? 'handed_off' : 'completed',
                    iterationCount: state.iterationCount,
                    tokensUsed: state.tokensUsed,
                    latencyMs: Date.now() - state.startTimeMs,
                    handoffReason: state.supervisorReasoning || undefined
                }
            });
        } catch (err) {
            logger.warn({ err }, 'Could not record agent run telemetry');
        }
    }
}
