import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { LlmService } from './llm.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../lib/auth.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('llm:manage')
@Controller('llm')
export class LlmController {
    constructor(private readonly llmService: LlmService) {}

    @Get('models')
    async listModels(@CurrentUser() user: AuthUser) {
        return this.llmService.listModels(user.workspaceId);
    }

    @Post('verify')
    async verifyModel(@Body() body: any) {
        return this.llmService.verifyModel(body);
    }

    @Post('models')
    async addModel(@CurrentUser() user: AuthUser, @Body() body: any) {
        return this.llmService.addModel(user.workspaceId, body);
    }

    @Patch('models/:id/default')
    async setDefaultModel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.llmService.setDefaultModel(user.workspaceId, id);
    }

    @Delete('models/:id')
    async deleteModel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.llmService.deleteModel(user.workspaceId, id);
    }

    @Patch('settings')
    async updateAiSettings(@CurrentUser() user: AuthUser, @Body() body: any) {
        return this.llmService.updateAiSettings(user.workspaceId, body);
    }

    @Get('logs')
    async getObservabilityLogs(@CurrentUser() user: AuthUser) {
        return this.llmService.getObservabilityLogs(user.workspaceId);
    }
}
