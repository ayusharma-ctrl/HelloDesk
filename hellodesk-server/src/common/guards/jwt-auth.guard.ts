import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { verifyToken } from '../../lib/auth.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { logger } from '../../lib/logger.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const header = req.headers?.authorization;

        if (!header?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Unauthorized');
        }

        try {
            const token = header.slice(7);
            const decoded = verifyToken(token);

            if (!decoded?.id) {
                throw new UnauthorizedException('Invalid token payload');
            }

            const dbUser = await this.prisma.user.findUnique({
                where: { id: decoded.id },
                include: { role: true },
            });

            if (!dbUser || !dbUser.isActive) {
                throw new UnauthorizedException('User account inactive or not found');
            }

            req.user = {
                id: dbUser.id,
                email: dbUser.email,
                workspaceId: dbUser.workspaceId,
                roleName: dbUser.role.name,
            };

            return true;
        } catch (err: any) {
            logger.warn({ err: err?.message }, 'JwtAuthGuard authentication rejected');
            throw new UnauthorizedException('Unauthorized');
        }
    }
}
