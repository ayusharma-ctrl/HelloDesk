import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { WidgetService } from './widget.service.js';
import { getIoInstance } from '../../events.gateway.js';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard.js';

@UseGuards(RateLimitGuard)
@RateLimit('widget', 10, 1)
@Controller('widget')
export class WidgetController {
    constructor(private readonly widgetService: WidgetService) {}

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

    @Get('status')
    async getStatus(@Query('workspaceId') workspaceId?: string) {
        return this.widgetService.getStatus(workspaceId ?? '');
    }
}
