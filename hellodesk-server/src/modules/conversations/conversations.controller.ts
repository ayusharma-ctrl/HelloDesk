import { Request, Response } from 'express';
import { sendMessageSchema, sendEmailMessageSchema, updateStatusSchema, reassignSchema } from './conversations.schema.js';
import * as conversationsService from './conversations.service.js';

function getId(req: Request): string {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export async function listConversations(req: Request, res: Response) {
    try {
        const { status, assignee, channel } = req.query as Record<string, string | undefined>;
        const conversations = await conversationsService.listConversations(req.user!.workspaceId, { status, assignee, channel }, req.user!);
        return res.json({ conversations });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}

export async function getConversation(req: Request, res: Response) {
    try {
        const conversation = await conversationsService.getConversation(getId(req), req.user!.workspaceId, req.user!);
        return res.json({ conversation });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}

export async function addMessage(req: Request, res: Response) {
    try {
        const input = sendMessageSchema.parse(req.body);
        const { conversation, message } = await conversationsService.addMessage(getId(req), req.user!.workspaceId, input, req.user!.id, req.user!);
        const io = req.app.get('io');
        io.to(`workspace:${req.user!.workspaceId}`).emit('message:created', { conversationId: conversation.id, message });

        if (conversation.contact?.visitorId) {
            io.to(`visitor:${conversation.contact.visitorId}`).emit('message:created', { conversationId: conversation.id, message });
        }

        return res.status(201).json({ message });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Server error' });
    }
}

export async function addEmailMessage(req: Request, res: Response) {
    try {
        const input = sendEmailMessageSchema.parse(req.body);
        const result = await conversationsService.addEmailMessage(getId(req), req.user!.workspaceId, input, req.user!.id, req.user!);
        const io = req.app.get('io');
        io.to(`workspace:${req.user!.workspaceId}`).emit('message:created', { conversationId: getId(req), message: result.message });
        return res.status(201).json(result);
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Server error' });
    }
}

export async function updateStatus(req: Request, res: Response) {
    try {
        const input = updateStatusSchema.parse(req.body);
        const updated = await conversationsService.updateStatus(getId(req), req.user!.workspaceId, input, req.user!);
        const io = req.app.get('io');
        io.to(`workspace:${req.user!.workspaceId}`).emit('conversation:updated', { conversationId: getId(req), conversation: updated });
        if (updated?.contact?.visitorId) {
            io.to(`visitor:${updated.contact.visitorId}`).emit('conversation:updated', { conversationId: getId(req), conversation: updated });
        }
        return res.json({ conversation: updated });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Server error' });
    }
}

export async function reassign(req: Request, res: Response) {
    try {
        const input = reassignSchema.parse(req.body);
        const updated = await conversationsService.reassign(getId(req), req.user!.workspaceId, input, req.user!);
        const io = req.app.get('io');
        io.to(`workspace:${req.user!.workspaceId}`).emit('conversation:updated', { conversationId: getId(req), conversation: updated });
        if (updated?.contact?.visitorId) {
            io.to(`visitor:${updated.contact.visitorId}`).emit('conversation:updated', { conversationId: getId(req), conversation: updated });
        }
        return res.json({ conversation: updated });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Server error' });
    }
}

export async function markRead(req: Request, res: Response) {
    try {
        const result = await conversationsService.markRead(getId(req), req.user!.workspaceId, req.user!);
        const io = req.app.get('io');
        io.to(`workspace:${req.user!.workspaceId}`).emit('conversation:updated', { conversationId: getId(req), conversation: result.conversation });
        if (result.conversation?.contact?.visitorId) {
            io.to(`visitor:${result.conversation.contact.visitorId}`).emit('conversation:updated', { conversationId: getId(req), conversation: result.conversation });
        }
        return res.json({ ok: true, readCount: result.readCount });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}

export async function getAiSummary(req: Request, res: Response) {
    try {
        const summary = await conversationsService.getAiSummary(getId(req), req.user!.workspaceId, req.user!);
        return res.json({ summary });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}

export async function getAiDraft(req: Request, res: Response) {
    try {
        const draft = await conversationsService.getAiDraft(getId(req), req.user!.workspaceId, req.user!);
        return res.json({ draft });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}
