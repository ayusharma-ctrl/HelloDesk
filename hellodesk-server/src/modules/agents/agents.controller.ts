import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AgentsService } from './agents.service.js';
import { getIoInstance } from '../../events.gateway.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) {}

    @Get('me/status')
    async getMyStatus(@CurrentUser() user: AuthUser) {
        return this.agentsService.getStatus(user.workspaceId, user.id);
    }

    @Patch('me/status')
    async setMyStatus(@CurrentUser() user: AuthUser, @Body() body: { status?: string }) {
        const result = await this.agentsService.setStatus(user.workspaceId, user.id, body.status ?? '');
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${user.workspaceId}`).emit('presence:changed', { workspaceId: user.workspaceId, userId: user.id, status: body.status });
        }
        return result;
    }

    @Get('presence')
    async listPresence(@CurrentUser() user: AuthUser) {
        return this.agentsService.listPresence(user.workspaceId);
    }
}
