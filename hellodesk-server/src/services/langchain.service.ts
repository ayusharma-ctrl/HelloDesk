import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export interface LlmExecutionResult {
    content: string | null;
    provider: string;
    modelName: string;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    latencyMs: number;
    status: 'success' | 'failed' | 'rate_limited' | 'invalid_key';
    errorMessage?: string;
}

export function createLangChainModel(provider: string, modelName: string, apiKey: string): BaseChatModel {
    if (provider === 'google') {
        return new ChatGoogleGenerativeAI({
            apiKey,
            model: modelName || 'gemini-2.5-flash',
            temperature: 0.2,
        });
    } else if (provider === 'openai') {
        return new ChatOpenAI({
            openAIApiKey: apiKey,
            modelName: modelName || 'gpt-4o-mini',
            temperature: 0.2,
        });
    }
    // Default fallback to Google GenAI
    return new ChatGoogleGenerativeAI({
        apiKey,
        model: 'gemini-2.5-flash',
        temperature: 0.2,
    });
}

export async function testLlmCredentials(provider: string, modelName: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const chat = createLangChainModel(provider, modelName, apiKey);
        const response = await chat.invoke([new HumanMessage('Hello, test connection.')]);
        return { success: !!response.content };
    } catch (err: any) {
        const errorMsg = err?.message || 'Failed to verify API key';
        logger.warn({ err, provider, modelName }, 'LLM verification failed');
        return { success: false, error: errorMsg };
    }
}

export async function executeLlmTask(
    workspaceId: string,
    conversationId: string | null,
    taskType: 'summary' | 'draft',
    systemPrompt: string,
    userPrompt: string
): Promise<LlmExecutionResult | null> {
    const startTime = Date.now();

    // 1. Check workspace master AI toggle & Tier Limit
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { workspaceTier: true }
    });

    if (!workspace || !workspace.aiEnabled) {
        logger.info({ workspaceId }, 'AI processing skipped: AI disabled for workspace');
        return null;
    }

    // 2. Fetch candidate workspace LLM models ordered by isDefault DESC, createdAt ASC
    const candidateModels = await prisma.llmModel.findMany({
        where: { workspaceId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // Filter out models currently in rate limit cooldown or invalid status
    const now = new Date();
    const validModels = candidateModels.filter(m => {
        if (m.status === 'invalid_key') return false;
        if (m.status === 'rate_limited' && m.rateLimitResetAt && m.rateLimitResetAt > now) return false;
        return true;
    });

    let selectedModel = validModels[0] || null;
    let provider = selectedModel ? selectedModel.provider : 'google';
    let modelName = selectedModel ? selectedModel.modelName : 'gemini-2.5-flash';
    let apiKey = selectedModel ? selectedModel.apiKey : (process.env.GEMINI_API_KEY || '');
    let isSystemFallback = !selectedModel;

    // If using System Fallback, check workspace tier limit from workspaceTier table
    if (isSystemFallback) {
        if (!apiKey) {
            logger.warn('No LLM API key available for fallback');
            return null;
        }

        const tokenLimit = workspace.workspaceTier?.tokenLimit ?? 50000;
        if (workspace.freeTierTokensUsed >= tokenLimit) {
            logger.warn({ workspaceId, tier: workspace.tierKey, used: workspace.freeTierTokensUsed, limit: tokenLimit }, 'Workspace fallback token limit reached');
            // Log attempt
            await prisma.llmRequestLog.create({
                data: {
                    workspaceId,
                    conversationId,
                    provider: 'google',
                    modelName: 'gemini-2.5-flash (system)',
                    taskType,
                    latencyMs: Date.now() - startTime,
                    status: 'rate_limited',
                    errorMessage: `Workspace ${workspace.workspaceTier?.name || workspace.tierKey} tier fallback token limit reached (${tokenLimit.toLocaleString()} tokens)`,
                }
            });
            return null;
        }
    }

    try {
        const chat = createLangChainModel(provider, modelName, apiKey);
        const response = await chat.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
        ]);

        const latencyMs = Date.now() - startTime;
        const textContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

        // Estimate tokens if response metadata unavailable
        const metadata = (response as any).usage_metadata || (response as any).response_metadata?.tokenUsage || {};
        const promptTokens = metadata.input_tokens || metadata.promptTokens || Math.ceil(userPrompt.length / 4);
        const responseTokens = metadata.output_tokens || metadata.completionTokens || Math.ceil(textContent.length / 4);
        const totalTokens = promptTokens + responseTokens;

        // Reset rate limit status if model succeeded
        if (selectedModel) {
            await prisma.llmModel.update({
                where: { id: selectedModel.id },
                data: {
                    status: 'verified',
                    rateLimitResetAt: null,
                    totalTokensUsed: { increment: totalTokens }
                }
            });
        } else if (isSystemFallback) {
            await prisma.workspace.update({
                where: { id: workspaceId },
                data: { freeTierTokensUsed: { increment: totalTokens } }
            });
        }

        // Increment conversation token count if provided
        if (conversationId) {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { tokensUsed: { increment: totalTokens } }
            });
        }

        // Create Observability Log
        await prisma.llmRequestLog.create({
            data: {
                workspaceId,
                conversationId,
                provider,
                modelName: isSystemFallback ? `${modelName} (system)` : modelName,
                taskType,
                promptTokens,
                responseTokens,
                totalTokens,
                latencyMs,
                status: 'success',
            }
        });

        return {
            content: textContent.trim(),
            provider,
            modelName,
            promptTokens,
            responseTokens,
            totalTokens,
            latencyMs,
            status: 'success'
        };

    } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const errorMsg = err?.message || 'LLM execution error';
        const is401 = err?.status === 401 || errorMsg.includes('401') || errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('invalid api key');
        const is429 = err?.status === 429 || errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('quota');

        const statusStr = is401 ? 'invalid_key' : is429 ? 'rate_limited' : 'failed';

        // Update model status
        if (selectedModel) {
            const cooldownReset = new Date(Date.now() + 15 * 60 * 1000); // 15 min default reset
            await prisma.llmModel.update({
                where: { id: selectedModel.id },
                data: {
                    status: statusStr,
                    rateLimitResetAt: is429 ? cooldownReset : null,
                }
            });
        }

        // Log Observability failure
        await prisma.llmRequestLog.create({
            data: {
                workspaceId,
                conversationId,
                provider,
                modelName: isSystemFallback ? `${modelName} (system)` : modelName,
                taskType,
                latencyMs,
                status: statusStr,
                errorMessage: errorMsg,
            }
        });

        // Auto-switch / retry recursively with system fallback if custom model failed
        if (selectedModel) {
            logger.warn({ workspaceId, failedModel: selectedModel.modelName, err: errorMsg }, 'Custom LLM failed; attempting auto-switch / fallback');
            // Re-run execution without this broken model by marking temporary status
            return executeLlmTask(workspaceId, conversationId, taskType, systemPrompt, userPrompt);
        }

        return null;
    }
}
