import { Controller, Get, Post, Patch, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
    constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

    @RequirePermission('team:view')
    @Get()
    async listUsers(@CurrentUser() user: AuthUser) {
        const users = await this.usersService.listUsers(user.workspaceId);
        return { users };
    }

    @RequirePermission('agent:manage')
    @Post('invite')
    async inviteUser(@CurrentUser() user: AuthUser, @Body() body: any) {
        const invited = await this.usersService.inviteUser(user.workspaceId, body);
        return { user: invited };
    }

    @RequirePermission('agent:manage')
    @Patch(':id/role')
    async updateRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
        const updated = await this.usersService.updateRole(id, user.workspaceId, body);
        return { user: updated };
    }

    @RequirePermission('agent:manage')
    @Patch(':id/status')
    async updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
        const updated = await this.usersService.updateStatus(id, user.workspaceId, body);
        return { user: updated };
    }
}
