import { Request, Response } from 'express';
import * as agentsService from './agents.service.js';

export async function getMyStatus(req: Request, res: Response) {
    try {
        const result = await agentsService.getStatus(req.user!.workspaceId, req.user!.id);
        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function setMyStatus(req: Request, res: Response) {
    try {
        const { status } = req.body as { status?: string };
        if (!status) return res.status(400).json({ error: 'Status is required' });
        const result = await agentsService.setStatus(req.user!.workspaceId, req.user!.id, status);
        const io = req.app.get('io');
        io.to(`workspace:${req.user!.workspaceId}`).emit('presence:changed', { workspaceId: req.user!.workspaceId, userId: req.user!.id, status });
        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function listPresence(req: Request, res: Response) {
    try {
        const result = await agentsService.listPresence(req.user!.workspaceId);
        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}
