import { Request, Response } from 'express';
import { registerDomainSchema } from './domains.schema.js';
import * as domainsService from './domains.service.js';

export async function registerDomain(req: Request, res: Response) {
    try {
        const input = registerDomainSchema.parse(req.body);
        const domain = await domainsService.registerDomain(req.user!.workspaceId, input);
        return res.status(201).json({ domain });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}

export async function verifyDomain(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const domain = await domainsService.verifyDomain(id, req.user!.workspaceId);
        return res.json({ domain });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}

export async function getMyDomain(req: Request, res: Response) {
    try {
        const domain = await domainsService.getDomainForWorkspace(req.user!.workspaceId);
        return res.json({ domain: domain ?? null });
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}
