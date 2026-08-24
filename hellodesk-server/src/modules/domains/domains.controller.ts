import { Controller, Get, Post, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DomainsService } from './domains.service.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('domain:manage')
@Controller('domains')
export class DomainsController {
    constructor(@Inject(DomainsService) private readonly domainsService: DomainsService) {}

    @Post()
    async registerDomain(@CurrentUser() user: AuthUser, @Body() body: any) {
        const domain = await this.domainsService.registerDomain(user.workspaceId, body);
        return { domain };
    }

    @Get(':id/verify')
    async verifyDomain(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        const domain = await this.domainsService.verifyDomain(id, user.workspaceId);
        return { domain };
    }

    @Get('me')
    async getMyDomain(@CurrentUser() user: AuthUser) {
        const domain = await this.domainsService.getDomainForWorkspace(user.workspaceId);
        return { domain };
    }
}
