import { Request, Response } from 'express';
import { inviteSchema, updateRoleSchema, updateStatusSchema } from './users.schema.js';
import * as usersService from './users.service.js';
import { logger } from '../../lib/logger.js';

export async function listUsers(req: Request, res: Response) {
    try {
        const users = await usersService.listUsers(req.user!.workspaceId);
        return res.json({ users });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}

export async function inviteUser(req: Request, res: Response) {
    try {
        const input = inviteSchema.parse(req.body);
        const user = await usersService.inviteUser(input, req.user!.workspaceId);
        return res.status(201).json({ user });
    } catch (err: any) {
        logger.warn({ err }, 'invite error');
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid invite payload' });
    }
}

export async function updateRole(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const input = updateRoleSchema.parse(req.body);
        const user = await usersService.updateRole(id, req.user!.workspaceId, input);
        return res.json({ user });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}

export async function updateStatus(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const input = updateStatusSchema.parse(req.body);
        const user = await usersService.updateStatus(id, req.user!.workspaceId, input);
        return res.json({ user });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}
