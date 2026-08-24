import { Controller, Get, Post, Delete, Body, UseGuards, Inject } from '@nestjs/common';
import { WorkspaceEmailService } from './email.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('domain:manage')
@Controller('email')
export class EmailController {
    constructor(@Inject(WorkspaceEmailService) private readonly emailService: WorkspaceEmailService) {}

    @Get('config')
    async getConfig(@CurrentUser() user: AuthUser) {
        return this.emailService.getConfig(user.workspaceId);
    }

    @Post('verify')
    async verifyConfig(@Body() body: any) {
        return this.emailService.verifyConfig(body);
    }

    @Post('config')
    async saveConfig(@CurrentUser() user: AuthUser, @Body() body: any) {
        return this.emailService.saveConfig(user.workspaceId, body);
    }

    @Delete('config')
    async deleteConfig(@CurrentUser() user: AuthUser) {
        return this.emailService.deleteConfig(user.workspaceId);
    }

    @Post('test')
    async sendTestEmail(@CurrentUser() user: AuthUser, @Body() body: any) {
        return this.emailService.sendTestEmail(user.workspaceId, body);
    }
}
