import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger.js';

export interface StorageProvider {
    uploadFile(file: any): Promise<{ url: string; mediaType: string }>;
}

export class LocalStorageProvider implements StorageProvider {
    private uploadDir: string;

    constructor() {
        this.uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(file: any): Promise<{ url: string; mediaType: string }> {
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname)}`;
        const filePath = path.join(this.uploadDir, filename);
        await fs.promises.writeFile(filePath, file.buffer);
        
        let mediaType = 'document';
        if (file.mimetype.startsWith('image/')) mediaType = 'image';
        else if (file.mimetype.startsWith('video/')) mediaType = 'video';

        const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
        const url = `${baseUrl}/uploads/${filename}`;
        return { url, mediaType };
    }
}

// Extensible storage factory to switch providers cleanly (e.g. S3, Cloudinary)
export function getStorageProvider(): StorageProvider {
    return new LocalStorageProvider();
}
