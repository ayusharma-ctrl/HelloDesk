import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermission) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        if (!user || !user.roleName) {
            throw new UnauthorizedException('Unauthorized');
        }

        const role = await this.prisma.role.findFirst({
            where: { name: user.roleName },
            include: { rolePermissions: { include: { permission: true } } },
        });

        const hasPermission = role?.rolePermissions.some((rp) => rp.permission.key === requiredPermission);
        if (!hasPermission) {
            throw new ForbiddenException('Forbidden');
        }

        return true;
    }
}
