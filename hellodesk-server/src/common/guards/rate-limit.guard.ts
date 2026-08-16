import { SetMetadata, Injectable, CanActivate, ExecutionContext, HttpStatus, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import { TOKEN_BUCKET_LUA_SCRIPT } from '../../lib/token-bucket.js';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
    key: string;
    maxTokens: number;
    refillRate: number;
}

export const RateLimit = (key: string, maxTokens: number, refillRate: number) =>
    SetMetadata(RATE_LIMIT_KEY, { key, maxTokens, refillRate });

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!options) {
            return true;
        }

        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const ip = req.ip ?? 'unknown';
        const key = `rl:${options.key}:${ip}`;
        const now = Date.now();

        try {
            const result = (await redis.eval(
                TOKEN_BUCKET_LUA_SCRIPT,
                1,
                key,
                options.maxTokens,
                options.refillRate,
                now
            )) as [number, number];

            const allowed = result[0] === 1;
            const remaining = Math.floor(result[1]);

            if (!allowed) {
                logger.warn({ key, remaining }, 'Route rate limit exceeded');
                throw new HttpException(
                    {
                        error: 'Too many requests. Please slow down and try again later.',
                        retryAfterSeconds: options.refillRate,
                    },
                    HttpStatus.TOO_MANY_REQUESTS
                );
            }

            res.setHeader('X-RateLimit-Limit', options.maxTokens);
            res.setHeader('X-RateLimit-Remaining', remaining);
            return true;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            logger.error({ err }, 'Rate limiter Redis error — failing open');
            return true;
        }
    }
}
