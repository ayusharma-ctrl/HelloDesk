import { logger } from './logger.js';

/**
 * Wraps an async function with exponential-backoff retry logic.
 * @param fn         Async function to retry.
 * @param maxRetries Max number of retry attempts (default 3).
 * @param baseDelayMs Base delay before first retry in ms (doubles each attempt).
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 300
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                logger.warn({ attempt, delay, err }, 'Retrying after error');
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}
