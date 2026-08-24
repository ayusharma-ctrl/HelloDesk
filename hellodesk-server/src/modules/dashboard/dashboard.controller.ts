import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

    @RequirePermission('dashboard:view')
    @Get('overview')
    async getOverview(@CurrentUser() user: AuthUser) {
        return this.dashboardService.getOverview(user.workspaceId);
    }
}
