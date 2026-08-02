import type { Request, Response, NextFunction } from 'express';
import { redis } from './redis.js';
import { logger } from './logger.js';
import { TOKEN_BUCKET_LUA_SCRIPT } from './token-bucket.js';

/**
 * Token-bucket rate limiter using Redis.
 * @param key A string or function(req) → string used to namespace the bucket.
 * @param maxTokens Max tokens allowed in the bucket.
 * @param refillRate Number of tokens to add per second.
 */
export function tokenBucketRateLimiter(
    keyFn: string | ((req: Request) => string),
    maxTokens: number,
    refillRate: number
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const baseKey = typeof keyFn === 'function' ? keyFn(req) : keyFn;
            const ip = req.ip ?? 'unknown';
            const key = `rl:${baseKey}:${ip}`;

            const now = Date.now();

            const result = await redis.eval(
                TOKEN_BUCKET_LUA_SCRIPT,
                1, // number of keys
                key,
                maxTokens,
                refillRate,
                now
            ) as [number, number];

            const allowed = result[0] === 1;
            const remaining = Math.floor(result[1]);

            if (!allowed) {
                logger.warn({ key, remaining }, 'Rate limit exceeded');

                return res.status(429).json({
                    error: 'Too many requests. Please slow down and try again later.',
                    retryAfterSeconds: refillRate,
                });
            }

            // Attach headers for client awareness
            res.setHeader('X-RateLimit-Limit', maxTokens);
            res.setHeader('X-RateLimit-Remaining', remaining);
            next();
        } catch (err) {
            // If Redis is down, fail open (don't block legitimate traffic)
            logger.error({ err }, 'Rate limiter Redis error — failing open');
            next();
        }
    };
}

/**
 * Fixed window rate limiter (old strategy) using Redis.
 * @param key A string or function(req) → string used to namespace the bucket.
 * @param max Max requests allowed in the window.
 * @param windowMs Window duration in milliseconds.
 */
export function fixedWindowRateLimiter(
    keyFn: string | ((req: Request) => string),
    max: number,
    windowMs: number
) {
    const windowSec = Math.ceil(windowMs / 1000);

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const baseKey = typeof keyFn === 'function' ? keyFn(req) : keyFn;
            const ip = req.ip ?? 'unknown';
            const key = `rl:${baseKey}:${ip}`;

            const current = await redis.incr(key);
            if (current === 1) {
                // First request in window — set TTL
                await redis.expire(key, windowSec);
            }

            if (current > max) {
                logger.warn({ key, current, max }, 'Rate limit exceeded');

                const ttl = await redis.ttl(key);

                return res.status(429).json({
                    error: 'Too many requests. Please slow down and try again later.',
                    retryAfterSeconds: Math.max(ttl, 0),
                });
            }

            // Attach headers for client awareness
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
            next();
        } catch (err) {
            // If Redis is down, fail open (don't block legitimate traffic)
            logger.error({ err }, 'Rate limiter Redis error — failing open');
            next();
        }
    };
}
