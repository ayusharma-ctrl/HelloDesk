import { Controller, Get, Post, Delete, Body, UseGuards, Inject } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('theme:manage')
@Controller('storage')
export class StorageController {
    constructor(@Inject(StorageService) private readonly storageService: StorageService) {}

    @Get('config')
    async getConfig(@CurrentUser() user: AuthUser) {
        return this.storageService.getConfig(user.workspaceId);
    }

    @Post('verify')
    async verifyConfig(@Body() body: any) {
        return this.storageService.verifyConfig(body);
    }

    @Post('config')
    async saveConfig(@CurrentUser() user: AuthUser, @Body() body: any) {
        return this.storageService.saveConfig(user.workspaceId, body);
    }

    @Delete('config')
    async deleteConfig(@CurrentUser() user: AuthUser) {
        return this.storageService.deleteConfig(user.workspaceId);
    }
}
