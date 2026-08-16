import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

export async function updateTheme(req: Request, res: Response) {
    try {
        const { primaryColor, primaryHover, accentColor, bgColor, cardBg } = req.body;
        const workspaceId = req.user!.workspaceId;

        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                theme: {
                    primaryColor: primaryColor || '#2563eb',
                    primaryHover: primaryHover || '#1d4ed8',
                    accentColor: accentColor || '#4f46e5',
                    bgColor: bgColor || '#f8fafc',
                    cardBg: cardBg || '#ffffff'
                }
            }
        });

        return res.json({ theme: updated.theme });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to update workspace theme' });
    }
}

export async function updateWorkspaceDetails(req: Request, res: Response) {
    try {
        const { name, shortName, logoUrl } = req.body;
        const workspaceId = req.user!.workspaceId;

        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                ...(name ? { name: name.toLowerCase().trim().replace(/\s+/g, '-') } : {}),
                ...(shortName !== undefined ? { shortName: shortName.trim() } : {}),
                ...(logoUrl !== undefined ? { logoUrl } : {}),
            }
        });

        return res.json({ workspace: updated });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to update workspace details' });
    }
}
