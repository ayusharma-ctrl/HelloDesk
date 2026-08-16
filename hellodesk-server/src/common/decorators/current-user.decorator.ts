import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../lib/auth.js';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthUser => {
        const req = ctx.switchToHttp().getRequest();
        return req.user;
    },
);
