import { Request, Response } from 'express';
import { getStorageProvider } from '../../services/storage.service.js';
import { prisma } from '../../lib/prisma.js';

const storage = getStorageProvider();

export async function uploadMedia(req: Request, res: Response) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No media file provided' });
        }

        const { url, mediaType } = await storage.uploadFile(req.file);
        return res.json({ url, mediaType, originalName: req.file.originalname });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to upload file' });
    }
}
