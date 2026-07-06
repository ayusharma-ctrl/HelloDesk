import { Request, Response } from 'express';
import * as webhooksService from './webhooks.service.js';
import { logger } from '../../lib/logger.js';
import type { ResendInboundPayload } from './webhooks.types.js';

export async function inboundEmail(req: Request, res: Response) {
    try {
        const workspaceId = req.headers['x-workspace-id'] as string | undefined;
        if (!workspaceId) return res.status(400).json({ error: 'x-workspace-id header is required' });

        const payload = req.body as ResendInboundPayload;
        const result = await webhooksService.processInboundEmail(workspaceId, payload);

        const io = req.app.get('io');
        io.to(`workspace:${workspaceId}`).emit('message:created', { conversationId: result.conversationId, message: result.message });

        return res.status(201).json({ ok: true, conversationId: result.conversationId });
    } catch (err: any) {
        logger.warn({ err }, 'inbound email webhook error');
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}
