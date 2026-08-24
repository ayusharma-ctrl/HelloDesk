import { Controller, Get, Post, Body, Query, Param, UseGuards, Inject } from '@nestjs/common';
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

    @Get('conversations/:id')
    async getConversationHistory(@Param('id') id: string, @Query('visitorId') visitorId?: string) {
        return this.widgetService.getHistory(id, visitorId ?? '');
    }

    @Get('history')
    async getHistory(@Query('conversationId') conversationId?: string, @Query('visitorId') visitorId?: string) {
        return this.widgetService.getHistory(conversationId ?? '', visitorId ?? '');
    }

    @Get('kb-suggestions')
    async kbSuggestions(@Query('q') q?: string, @Query('workspaceId') workspaceId?: string) {
        return this.widgetService.kbSuggestions(q ?? '', workspaceId);
    }

    @Post('read')
    async markReadDirect(@Body() body: any) {
        return this.widgetService.markRead(body.conversationId, body.visitorId);
    }

    @Post('messages/read')
    async markRead(@Body() body: any) {
        return this.widgetService.markRead(body.conversationId, body.visitorId);
    }

    @Post('rate')
    async rateConversationDirect(@Body() body: any) {
        return this.widgetService.rateConversation(body.conversationId, body.visitorId, Number(body.rating), body.ratingFeedback || body.feedbackOption);
    }

    @Post('conversations/:id/rate')
    async rateConversationWithId(@Param('id') id: string, @Body() body: any) {
        return this.widgetService.rateConversation(id, body.visitorId, Number(body.rating), body.ratingFeedback || body.feedbackOption);
    }

    @Get('status')
    async getStatus(@Query('workspaceId') workspaceId?: string) {
        return this.widgetService.getStatus(workspaceId ?? '');
    }
}
