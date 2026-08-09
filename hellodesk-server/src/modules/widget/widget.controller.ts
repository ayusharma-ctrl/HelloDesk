import { Request, Response } from 'express';
import { startConversationSchema, sendWidgetMessageSchema } from './widget.schema.js';
import * as widgetService from './widget.service.js';

export async function startConversation(req: Request, res: Response) {
    try {
        const input = startConversationSchema.parse(req.body);
        const result = await widgetService.startConversation(input);
        const io = req.app.get('io') || (global as any).io;
        if (io) {
            io.to(`workspace:${input.workspaceId}`).emit('conversation:created', { conversation: result.conversation });
            io.to(`workspace:${input.workspaceId}`).emit('message:created', {
                conversationId: result.conversation.id,
                message: result.message
            });
            io.to(`visitor:${result.visitorId}`).emit('message:created', {
                conversationId: result.conversation.id,
                message: result.message
            });
        }
        return res.status(201).json(result);
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}

export async function sendMessage(req: Request, res: Response) {
    try {
        const input = sendWidgetMessageSchema.parse(req.body);
        const { message, conversation } = await widgetService.sendMessage(input);

        if (conversation) {
            const io = req.app.get('io') || (global as any).io;
            if (io) {
                io.to(`workspace:${conversation.workspaceId}`).emit('message:created', {
                    conversationId: conversation.id,
                    message
                });
                if (conversation.contact?.visitorId) {
                    io.to(`visitor:${conversation.contact.visitorId}`).emit('message:created', {
                        conversationId: conversation.id,
                        message
                    });
                }
            }
        }

        return res.status(201).json({ message });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}

export async function getHistory(req: Request, res: Response) {
    try {
        const { conversationId, visitorId } = req.query as { conversationId?: string; visitorId?: string };
        if (!conversationId || !visitorId) return res.status(400).json({ error: 'conversationId and visitorId required' });
        const result = await widgetService.getHistory(conversationId, visitorId);
        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function kbSuggestions(req: Request, res: Response) {
    try {
        const q = String(req.query.q ?? '');
        const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : undefined;
        const articles = await widgetService.kbSuggestions(q, workspaceId);
        return res.json({ articles });
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function getStatus(req: Request, res: Response) {
    try {
        const workspaceId = String(req.query.workspaceId ?? '');
        const online = await widgetService.getStatus(workspaceId);
        return res.json({ online });
    } catch (err: any) {
        return res.json({ online: false });
    }
}
