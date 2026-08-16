import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';
import { getIoInstance } from '../../events.gateway.js';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard.js';
import type { ResendInboundPayload } from './webhooks.types.js';

@UseGuards(RateLimitGuard)
@Controller('webhooks')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) {}

    @RateLimit('webhook', 20, 1 / 3)
    @Post('email/inbound')
    async inboundEmail(@Headers('x-workspace-id') workspaceId: string, @Body() payload: ResendInboundPayload) {
        const result = await this.webhooksService.processInboundEmail(workspaceId, payload);
        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('message:created', { conversationId: result.conversationId, message: result.message });
        }
        return { ok: true, conversationId: result.conversationId };
    }
}
