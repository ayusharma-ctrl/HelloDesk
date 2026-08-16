import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ThemeService } from './theme.service.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('theme:manage')
@Controller('theme')
export class ThemeController {
    constructor(private readonly themeService: ThemeService) {}

    @Put()
    async updateTheme(@CurrentUser() user: AuthUser, @Body() body: any) {
        return this.themeService.updateTheme(user.workspaceId, body);
    }

    @Put('details')
    async updateWorkspaceDetails(@CurrentUser() user: AuthUser, @Body() body: any) {
        return this.themeService.updateWorkspaceDetails(user.workspaceId, body);
    }
}
