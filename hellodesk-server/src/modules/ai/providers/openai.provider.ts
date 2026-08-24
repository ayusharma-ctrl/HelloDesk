import { LLMProvider, LLMMessage, LLMRequestOptions, LLMResponse } from '../interfaces/llm-provider.interface.js';
import { logger } from '../../../lib/logger.js';

export class OpenAIProvider implements LLMProvider {
    readonly providerName = 'openai';

    async generate(
        messages: LLMMessage[],
        modelName = 'gpt-4o-mini',
        apiKey?: string,
        options?: LLMRequestOptions
    ): Promise<LLMResponse> {
        const key = apiKey || process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error('OpenAI API key is required');
        }

        const startTime = Date.now();

        try {
            const formattedMessages = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: formattedMessages,
                    temperature: options?.temperature ?? 0.2,
                    max_tokens: options?.maxTokens ?? 1024,
                    stop: options?.stopSequences,
                    response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined
                })
            });

            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({}))) as any;
                throw new Error(errorData?.error?.message || `OpenAI API returned status ${response.status}`);
            }

            const data = (await response.json()) as any;
            const latencyMs = Date.now() - startTime;
            const content = data.choices[0]?.message?.content || '';

            return {
                content,
                provider: this.providerName,
                modelName,
                latencyMs,
                usage: {
                    promptTokens: data.usage?.prompt_tokens ?? Math.ceil(messages.reduce((a, b) => a + b.content.length, 0) / 4),
                    responseTokens: data.usage?.completion_tokens ?? Math.ceil(content.length / 4),
                    totalTokens: data.usage?.total_tokens ?? (Math.ceil(messages.reduce((a, b) => a + b.content.length, 0) / 4) + Math.ceil(content.length / 4))
                }
            };
        } catch (err: any) {
            logger.error({ err: err.message, modelName }, 'OpenAI generation error');
            throw err;
        }
    }

    async testCredentials(apiKey: string, modelName = 'gpt-4o-mini'): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (res.ok) return { success: true };
            const data = (await res.json().catch(() => ({}))) as any;
            return { success: false, error: data?.error?.message || 'Invalid OpenAI API key' };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to connect to OpenAI' };
        }
    }
}
