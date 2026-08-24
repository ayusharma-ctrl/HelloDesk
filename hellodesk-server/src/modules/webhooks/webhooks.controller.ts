import { Controller, Post, Body, Headers, Query, UseGuards, Inject } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';
import { getIoInstance } from '../../lib/socket-instance.js';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard.js';

@UseGuards(RateLimitGuard)
@Controller('webhooks')
export class WebhooksController {
    constructor(@Inject(WebhooksService) private readonly webhooksService: WebhooksService) {}

    // ── Resend Inbound Webhook ──────────────────────────────────────────
    @RateLimit('webhook', 20, 1 / 3)
    @Post(['email/inbound', 'email/resend'])
    async resendInbound(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
        @Body() payload: any = {},
    ) {
        const workspaceId = queryWsId || headerWsId || payload.workspaceId;
        const result = await this.webhooksService.processInboundEmail(workspaceId, {
            from: payload.from,
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
            headers: payload.headers,
        });

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('message:created', { conversationId: result.conversationId, message: result.message });
        }
        return { ok: true, conversationId: result.conversationId };
    }

    // ── SendGrid Inbound Parse Webhook ──────────────────────────────────
    @RateLimit('webhook', 20, 1 / 3)
    @Post('email/sendgrid')
    async sendgridInbound(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
        @Body() payload: any = {},
    ) {
        const workspaceId = queryWsId || headerWsId || payload.workspaceId;
        const from = payload.from || payload.envelope?.from || '';
        const to = payload.to || payload.envelope?.to?.[0] || '';
        const subject = payload.subject || 'Incoming Customer Email';
        const text = payload.text || '';
        const html = payload.html || '';

        let parsedHeaders: Record<string, string> = {};
        try {
            if (typeof payload.headers === 'string') {
                payload.headers.split('\n').forEach((line: string) => {
                    const idx = line.indexOf(':');
                    if (idx > 0) {
                        const key = line.substring(0, idx).trim().toLowerCase();
                        const val = line.substring(idx + 1).trim();
                        parsedHeaders[key] = val;
                    }
                });
            }
        } catch {}

        const result = await this.webhooksService.processInboundEmail(workspaceId, {
            from,
            to,
            subject,
            text,
            html,
            headers: parsedHeaders,
        });

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('message:created', { conversationId: result.conversationId, message: result.message });
        }
        return { ok: true, conversationId: result.conversationId };
    }

    // ── Mailgun Inbound Webhook ─────────────────────────────────────────
    @RateLimit('webhook', 20, 1 / 3)
    @Post('email/mailgun')
    async mailgunInbound(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
        @Body() payload: any = {},
    ) {
        const workspaceId = queryWsId || headerWsId || payload.workspaceId;
        const from = payload.sender || payload.from || '';
        const to = payload.recipient || payload.to || '';
        const subject = payload.subject || 'Incoming Customer Email';
        const text = payload['body-plain'] || payload.text || '';
        const html = payload['body-html'] || payload.html || '';

        const inReplyTo = payload['In-Reply-To'] || payload['in-reply-to'];
        const references = payload['References'] || payload['references'];
        const messageId = payload['Message-Id'] || payload['message-id'];

        const result = await this.webhooksService.processInboundEmail(workspaceId, {
            from,
            to,
            subject,
            text,
            html,
            headers: {
                'message-id': messageId,
                'in-reply-to': inReplyTo,
                references,
            },
        });

        const io = getIoInstance();
        if (io) {
            io.to(`workspace:${workspaceId}`).emit('message:created', { conversationId: result.conversationId, message: result.message });
        }
        return { ok: true, conversationId: result.conversationId };
    }
}
