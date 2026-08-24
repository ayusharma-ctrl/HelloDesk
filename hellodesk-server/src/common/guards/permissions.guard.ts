import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator.js';
import { PermissionsService } from '../../modules/permissions/permissions.service.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        @Inject(Reflector) private reflector: Reflector,
        @Inject(PermissionsService) private permissionsService: PermissionsService,
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

        const effectivePermissions = await this.permissionsService.getEffectivePermissions(user.id, user.workspaceId, user.roleName);

        const hasPermission = effectivePermissions.includes(requiredPermission);
        if (!hasPermission) {
            throw new ForbiddenException(`Access denied. Missing required permission '${requiredPermission}'.`);
        }

        return true;
    }
}
