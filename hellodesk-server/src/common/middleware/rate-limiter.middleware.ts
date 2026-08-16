import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import { TOKEN_BUCKET_LUA_SCRIPT } from '../../lib/token-bucket.js';

@Injectable()
export class TokenBucketRateLimiterMiddleware implements NestMiddleware {
    private maxTokens: number = 60;
    private refillRate: number = 10;

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            const ip = req.ip ?? 'unknown';
            const key = `rl:global:${ip}`;
            const now = Date.now();

            const result = (await redis.eval(
                TOKEN_BUCKET_LUA_SCRIPT,
                1,
                key,
                this.maxTokens,
                this.refillRate,
                now
            )) as [number, number];

            const allowed = result[0] === 1;
            const remaining = Math.floor(result[1]);

            if (!allowed) {
                logger.warn({ key, remaining }, 'Rate limit exceeded');
                return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
                    error: 'Too many requests. Please slow down and try again later.',
                    retryAfterSeconds: this.refillRate,
                });
            }

            res.setHeader('X-RateLimit-Limit', this.maxTokens);
            res.setHeader('X-RateLimit-Remaining', remaining);
            next();
        } catch (err) {
            logger.error({ err }, 'Rate limiter Redis error — failing open');
            next();
        }
    }
}
