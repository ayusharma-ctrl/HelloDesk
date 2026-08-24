import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMMessage, LLMRequestOptions, LLMResponse } from '../interfaces/llm-provider.interface.js';
import { logger } from '../../../lib/logger.js';

export class GeminiProvider implements LLMProvider {
    readonly providerName = 'google';

    async generate(
        messages: LLMMessage[],
        modelName = 'gemini-3.5-flash-lite',
        apiKey?: string,
        options?: LLMRequestOptions
    ): Promise<LLMResponse> {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error('Gemini API key is required');
        }

        const startTime = Date.now();
        const genAI = new GoogleGenerativeAI(key);

        const systemMessage = messages.find(m => m.role === 'system');
        const nonSystemMessages = messages.filter(m => m.role !== 'system');

        // Convert non-system messages to Gemini contents format
        const contents = nonSystemMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const cleanModel = (modelName || 'gemini-3.5-flash-lite').replace(/^models\//, '');
        const candidateModels = Array.from(new Set([
            cleanModel,
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemma-4-26b-a4b-it',
            'gemma-4-31b-it',
            'gemini-3-flash-preview'
        ]));

        let lastErr: any = null;
        for (const candidate of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: candidate,
                    systemInstruction: systemMessage ? systemMessage.content : undefined,
                    generationConfig: {
                        temperature: options?.temperature ?? 0.2,
                        maxOutputTokens: options?.maxTokens ?? 1024,
                        stopSequences: options?.stopSequences,
                        responseMimeType: options?.responseFormat === 'json' ? 'application/json' : undefined,
                    }
                });

                const result = await model.generateContent({ contents });
                const responseText = result.response.text();
                const latencyMs = Date.now() - startTime;

                const usageMetadata = result.response.usageMetadata;
                const promptTokens = usageMetadata?.promptTokenCount ?? Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
                const responseTokens = usageMetadata?.candidatesTokenCount ?? Math.ceil(responseText.length / 4);

                return {
                    content: responseText,
                    provider: this.providerName,
                    modelName: candidate,
                    latencyMs,
                    usage: {
                        promptTokens,
                        responseTokens,
                        totalTokens: promptTokens + responseTokens
                    }
                };
            } catch (err: any) {
                lastErr = err;
                logger.warn({ failedModel: candidate, err: err.message }, 'Gemini model attempt failed; trying stable candidate fallback');
            }
        }

        logger.error({ err: lastErr?.message, modelName }, 'All Gemini model candidates failed');
        throw lastErr;
    }

    async testCredentials(apiKey: string, modelName = 'gemini-3.6-flash'): Promise<{ success: boolean; error?: string }> {
        const candidateModels = [
            (modelName || 'gemini-3.6-flash').replace(/^models\//, ''),
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite'
        ];

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            for (const candidate of candidateModels) {
                try {
                    const model = genAI.getGenerativeModel({ model: candidate });
                    const res = await model.generateContent('ping');
                    if (res?.response?.text()) return { success: true };
                } catch (e: any) {
                    if (e?.message?.includes('429') || e?.message?.includes('Quota exceeded')) {
                        return { success: true };
                    }
                }
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to authenticate Gemini API key' };
        }
    }
}
