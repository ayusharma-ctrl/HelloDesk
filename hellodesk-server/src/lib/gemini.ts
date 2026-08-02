import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Simple Circuit Breaker logic
let failures = 0;
let nextTryAt = 0;
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60000; // 1 minute cooldown

export async function generateContent(prompt: string): Promise<string | null> {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('Skipping AI generation: GEMINI_API_KEY not set.');
        return null;
    }

    if (Date.now() < nextTryAt) {
        logger.warn('Circuit breaker open: Skipping AI generation.');
        return null;
    }

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;

        // Reset failures on success
        if (failures > 0) failures = 0;

        return response.text();
    } catch (error: any) {
        logger.error({ error }, 'Gemini API call failed');
        failures++;

        if (failures >= FAILURE_THRESHOLD) {
            nextTryAt = Date.now() + COOLDOWN_MS;
            logger.error(`Circuit breaker tripped. Will retry AI after ${COOLDOWN_MS / 1000} seconds.`);
        }

        return null; // Graceful fallback
    }
}
