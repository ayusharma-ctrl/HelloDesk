export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    toolCallId?: string;
}

export interface LLMRequestOptions {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
    stopSequences?: string[];
}

export interface LLMUsage {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
}

export interface LLMResponse {
    content: string;
    usage: LLMUsage;
    provider: string;
    modelName: string;
    latencyMs: number;
    finishReason?: string;
}

export interface LLMProvider {
    readonly providerName: string;
    generate(
        messages: LLMMessage[],
        modelName?: string,
        apiKey?: string,
        options?: LLMRequestOptions
    ): Promise<LLMResponse>;
    testCredentials(apiKey: string, modelName?: string): Promise<{ success: boolean; error?: string }>;
}
