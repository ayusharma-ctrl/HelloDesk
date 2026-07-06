import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service.js';

export async function getOverview(req: Request, res: Response) {
    try {
        const overview = await dashboardService.getOverview(req.user!.workspaceId);
        return res.json({ overview });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}
