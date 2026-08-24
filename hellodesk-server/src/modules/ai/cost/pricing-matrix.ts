export interface ModelPricing {
    provider: string;
    model: string;
    inputCostPer1M: number;  // USD
    outputCostPer1M: number; // USD
}

export const PRICING_MATRIX_V1: Record<string, ModelPricing> = {
    'gemini-3.6-flash': {
        provider: 'google',
        model: 'gemini-3.6-flash',
        inputCostPer1M: 0.075,
        outputCostPer1M: 0.30,
    },
    'gemini-3.5-flash': {
        provider: 'google',
        model: 'gemini-3.5-flash',
        inputCostPer1M: 0.075,
        outputCostPer1M: 0.30,
    },
    'gemini-3.5-flash-lite': {
        provider: 'google',
        model: 'gemini-3.5-flash-lite',
        inputCostPer1M: 0.0375,
        outputCostPer1M: 0.15,
    },
    'gemini-3.1-flash-lite': {
        provider: 'google',
        model: 'gemini-3.1-flash-lite',
        inputCostPer1M: 0.0375,
        outputCostPer1M: 0.15,
    },
    'gemini-flash-latest': {
        provider: 'google',
        model: 'gemini-flash-latest',
        inputCostPer1M: 0.075,
        outputCostPer1M: 0.30,
    },
    'gemini-3.7-flash': {
        provider: 'google',
        model: 'gemini-3.7-flash',
        inputCostPer1M: 0.075,
        outputCostPer1M: 0.30,
    },
    'gemini-2.5-flash': {
        provider: 'google',
        model: 'gemini-2.5-flash',
        inputCostPer1M: 0.075,
        outputCostPer1M: 0.30,
    },
    'gpt-4o-mini': {
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputCostPer1M: 0.15,
        outputCostPer1M: 0.60,
    },
    'gemini-embedding-001': {
        provider: 'google',
        model: 'gemini-embedding-001',
        inputCostPer1M: 0.02,
        outputCostPer1M: 0.0,
    },
    'text-embedding-004': {
        provider: 'google',
        model: 'text-embedding-004',
        inputCostPer1M: 0.02,
        outputCostPer1M: 0.0,
    }
};

export function calculateCostUsd(model: string, promptTokens: number, responseTokens: number): number {
    const pricing = PRICING_MATRIX_V1[model] || PRICING_MATRIX_V1['gemini-3.6-flash'] || PRICING_MATRIX_V1['gemini-2.5-flash'];
    const inputCost = (promptTokens / 1_000_000) * pricing.inputCostPer1M;
    const outputCost = (responseTokens / 1_000_000) * pricing.outputCostPer1M;
    return Number((inputCost + outputCost).toFixed(6));
}
