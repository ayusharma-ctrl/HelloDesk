import { Controller, Get, Post, Body, Query, UseGuards, Inject } from '@nestjs/common';
import { WidgetService } from './widget.service.js';
import { getIoInstance } from '../../lib/socket-instance.js';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard.js';

@Controller('widget')
export class WidgetController {
    constructor(@Inject(WidgetService) private readonly widgetService: WidgetService) {}

    @UseGuards(RateLimitGuard)
    @RateLimit('widget:start', 10, 1)
    @Post('conversations')
    async startConversation(@Body() body: any) {
        const result = await this.widgetService.startConversation(body);
        const io = getIoInstance();
        if (io && result.conversation) {
            io.to(`workspace:${body.workspaceId}`).emit('conversation:created', { conversation: result.conversation });
            io.to(`workspace:${body.workspaceId}`).emit('message:created', {
                conversationId: result.conversation.id,
                message: result.message,
            });
            io.to(`visitor:${result.visitorId}`).emit('message:created', {
                conversationId: result.conversation.id,
                message: result.message,
            });
        }
        return result;
    }

    @UseGuards(RateLimitGuard)
    @RateLimit('widget:msg', 30, 1)
    @Post('messages')
    async sendMessage(@Body() body: any) {
        const { message, conversation } = await this.widgetService.sendMessage(body);

        if (conversation) {
            const io = getIoInstance();
            if (io) {
                io.to(`workspace:${conversation.workspaceId}`).emit('message:created', {
                    conversationId: conversation.id,
                    message,
                });
                if (conversation.contact?.visitorId) {
                    io.to(`visitor:${conversation.contact.visitorId}`).emit('message:created', {
                        conversationId: conversation.id,
                        message,
                    });
                }
            }
        }

        return { message };
    }

    @Get('history')
    async getHistory(@Query('conversationId') conversationId?: string, @Query('visitorId') visitorId?: string) {
        return this.widgetService.getHistory(conversationId ?? '', visitorId ?? '');
    }

    @Get('kb-suggestions')
    async kbSuggestions(@Query('q') q?: string, @Query('workspaceId') workspaceId?: string) {
        return this.widgetService.kbSuggestions(q ?? '', workspaceId);
    }

    @Post('messages/read')
    async markRead(@Body() body: any) {
        return this.widgetService.markRead(body.conversationId, body.visitorId);
    }

    @Get('status')
    async getStatus(@Query('workspaceId') workspaceId?: string) {
        return this.widgetService.getStatus(workspaceId ?? '');
    }
}
