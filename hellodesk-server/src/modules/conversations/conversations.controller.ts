import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { sendMessageSchema, sendEmailMessageSchema, updateStatusSchema, reassignSchema } from './conversations.schema.js';
import { ConversationsService } from './conversations.service.js';
import { getIoInstance } from '../../lib/socket-instance.js';
import type { AuthUser } from '../../lib/auth.js';

@Controller('conversations')
export class ConversationsController {
    constructor(@Inject(ConversationsService) private readonly conversationsService: ConversationsService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    async listConversations(
        @CurrentUser() user: AuthUser,
        @Query('status') status?: string,
        @Query('assignee') assignee?: string,
        @Query('channel') channel?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.conversationsService.listConversations(
            user.workspaceId,
            { status, assignee, channel, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined },
            user,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async getConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        const conversation = await this.conversationsService.getConversation(id, user.workspaceId, user);
        return { conversation };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('conversation:reply')
    @Post(':id/messages')
    async addMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
        const input = sendMessageSchema.parse(body);
        const { message, conversation } = await this.conversationsService.addMessage(id, user.workspaceId, input, user.id);
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${user.workspaceId}`).emit('message:created', { conversationId: id, message });
            if (conversation?.contact?.visitorId) {
                io.to(`visitor:${conversation.contact.visitorId}`).emit('message:created', { conversationId: id, message });
            }
        }
        return { message };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('conversation:reply')
    @Post(':id/messages/email')
    async addEmailMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
        const input = sendEmailMessageSchema.parse(body);
        const result = await this.conversationsService.addEmailMessage(id, user.workspaceId, input, user.id, user);
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${user.workspaceId}`).emit('message:created', { conversationId: id, message: result.message });
        }
        return result;
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('conversation:status:update')
    @Patch(':id/status')
    async updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
        const input = updateStatusSchema.parse(body);
        const updated = await this.conversationsService.updateStatus(id, user.workspaceId, input);
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${user.workspaceId}`).emit('conversation:updated', { conversationId: id, conversation: updated });
            if (updated.contact?.visitorId) {
                io.to(`visitor:${updated.contact.visitorId}`).emit('conversation:updated', { conversationId: id, conversation: updated });
            }
        }
        return { conversation: updated };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('conversation:reassign')
    @Patch(':id/reassign')
    async reassign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
        const input = reassignSchema.parse(body);
        const updated = await this.conversationsService.reassign(id, user.workspaceId, input);
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${user.workspaceId}`).emit('conversation:updated', { conversationId: id, conversation: updated });
        }
        return { conversation: updated };
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/read')
    async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        const result = await this.conversationsService.markRead(id, user.workspaceId);
        const io = getIoInstance();
        if (io) {
            // Emit to workspace so agent dashboard updates "seen" status in real time
            io.to(`workspace:${user.workspaceId}`).emit('message:read', { conversationId: id, readAt: new Date().toISOString() });
            if (result.visitorId) {
                // Emit to visitor so widget updates visitor message "✓ Seen" status
                io.to(`visitor:${result.visitorId}`).emit('message:read', { conversationId: id, readAt: new Date().toISOString() });
            }
        }
        return { ok: true };
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/ai-summary')
    async getAiSummary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.conversationsService.getAiSummary(id, user.workspaceId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/ai-draft')
    async getAiDraft(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.conversationsService.getAiDraft(id, user.workspaceId);
    }

    @Post(':id/rate')
    async rateConversation(@Param('id') id: string, @Body() body: any) {
        const { rating, feedbackOption } = body;
        return this.conversationsService.rateConversation(id, Number(rating), feedbackOption);
    }
}
