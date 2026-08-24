import { v2 as cloudinary } from 'cloudinary';
import ImageKit from 'imagekit';
import { S3Client, PutObjectCommand, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger.js';

export interface StorageProvider {
    uploadFile(file: any, folder?: string): Promise<{ url: string; mediaType: string }>;
}

export interface CloudinaryCredentials {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
}

export interface ImageKitCredentials {
    publicKey: string;
    privateKey: string;
    urlEndpoint: string;
}

export interface S3Credentials {
    bucketName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
}

export class CloudinaryStorageProvider implements StorageProvider {
    private client: typeof cloudinary;

    constructor(credentials?: CloudinaryCredentials) {
        this.client = cloudinary;
        if (credentials && credentials.cloudName && credentials.apiKey && credentials.apiSecret) {
            this.client.config({
                cloud_name: credentials.cloudName,
                api_key: credentials.apiKey,
                api_secret: credentials.apiSecret,
                secure: true,
            });
        } else if (process.env.CLOUDINARY_URL) {
            this.client.config({ cloudinary_url: process.env.CLOUDINARY_URL });
        } else {
            this.client.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
                secure: true,
            });
        }
    }

    async uploadFile(file: any, folder: string = 'hellodesk/uploads'): Promise<{ url: string; mediaType: string }> {
        return new Promise((resolve, reject) => {
            let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';
            let mediaType = 'document';
            if (file.mimetype?.startsWith('image/')) {
                resourceType = 'image';
                mediaType = 'image';
            } else if (file.mimetype?.startsWith('video/')) {
                resourceType = 'video';
                mediaType = 'video';
            } else {
                resourceType = 'raw';
            }

            const uploadStream = this.client.uploader.upload_stream(
                {
                    folder,
                    resource_type: resourceType,
                },
                (error, result) => {
                    if (error) {
                        logger.error({ err: error }, 'Cloudinary upload error');
                        return reject(error);
                    }
                    if (!result) {
                        return reject(new Error('Cloudinary returned empty result'));
                    }
                    resolve({
                        url: result.secure_url || result.url,
                        mediaType,
                    });
                }
            );

            uploadStream.end(file.buffer);
        });
    }

    async verify(): Promise<{ success: boolean; error?: string }> {
        try {
            const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            const res = await this.client.uploader.upload(testBase64, {
                folder: 'hellodesk/test',
                public_id: `verify_${Date.now()}`,
                overwrite: true,
            });
            if (res && res.secure_url) {
                await this.client.uploader.destroy(res.public_id).catch(() => {});
                return { success: true };
            }
            return { success: false, error: 'Verification failed: Cloudinary returned empty response' };
        } catch (err: any) {
            return { success: false, error: err.message || 'Invalid Cloudinary credentials' };
        }
    }
}

export class ImageKitStorageProvider implements StorageProvider {
    private ik: ImageKit;

    constructor(credentials: ImageKitCredentials) {
        this.ik = new ImageKit({
            publicKey: credentials.publicKey,
            privateKey: credentials.privateKey,
            urlEndpoint: credentials.urlEndpoint.replace(/\/$/, ''),
        });
    }

    async uploadFile(file: any, folder: string = '/hellodesk/uploads'): Promise<{ url: string; mediaType: string }> {
        let mediaType = 'document';
        if (file.mimetype?.startsWith('image/')) mediaType = 'image';
        else if (file.mimetype?.startsWith('video/')) mediaType = 'video';

        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname || 'file')}`;

        const result = await this.ik.upload({
            file: file.buffer,
            fileName: filename,
            folder: folder.startsWith('/') ? folder : `/${folder}`,
            useUniqueFileName: true,
        });

        return {
            url: result.url,
            mediaType,
        };
    }

    async verify(): Promise<{ success: boolean; error?: string }> {
        try {
            const list = await this.ik.listFiles({ limit: 1 });
            if (Array.isArray(list)) {
                return { success: true };
            }
            return { success: false, error: 'Failed to query ImageKit files with provided keys' };
        } catch (err: any) {
            return { success: false, error: err.message || 'Invalid ImageKit credentials' };
        }
    }
}

export class S3StorageProvider implements StorageProvider {
    private s3Client: S3Client;
    private bucketName: string;
    private region: string;
    private endpoint?: string;

    constructor(credentials: S3Credentials) {
        this.bucketName = credentials.bucketName;
        this.region = credentials.region || 'us-east-1';
        this.endpoint = credentials.endpoint;

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
            ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
        });
    }

    async uploadFile(file: any, folder: string = 'hellodesk/uploads'): Promise<{ url: string; mediaType: string }> {
        let mediaType = 'document';
        if (file.mimetype?.startsWith('image/')) mediaType = 'image';
        else if (file.mimetype?.startsWith('video/')) mediaType = 'video';

        const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname || 'file')}`;

        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucketName,
            Key: filename,
            Body: file.buffer,
            ContentType: file.mimetype || 'application/octet-stream',
        }));

        let url: string;
        if (this.endpoint) {
            url = `${this.endpoint.replace(/\/$/, '')}/${this.bucketName}/${filename}`;
        } else {
            url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
        }

        return { url, mediaType };
    }

    async verify(): Promise<{ success: boolean; error?: string }> {
        try {
            // Test S3 connectivity by listing max 1 object or checking bucket
            const res = await this.s3Client.send(new ListObjectsV2Command({
                Bucket: this.bucketName,
                MaxKeys: 1,
            }));
            if (res && (res.$metadata.httpStatusCode === 200 || res.KeyCount !== undefined)) {
                return { success: true };
            }
            return { success: false, error: 'Failed to access specified AWS S3 bucket' };
        } catch (err: any) {
            return { success: false, error: err.message || 'Invalid AWS S3 credentials or bucket access' };
        }
    }
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
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname || 'file')}`;
        const filePath = path.join(this.uploadDir, filename);
        await fs.promises.writeFile(filePath, file.buffer);

        let mediaType = 'document';
        if (file.mimetype?.startsWith('image/')) mediaType = 'image';
        else if (file.mimetype?.startsWith('video/')) mediaType = 'video';

        const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
        const url = `${baseUrl}/uploads/${filename}`;
        return { url, mediaType };
    }
}

export async function testStorageCredentials(provider: string, credentials: any): Promise<{ success: boolean; error?: string }> {
    if (provider === 'cloudinary') {
        const p = new CloudinaryStorageProvider(credentials);
        return p.verify();
    } else if (provider === 'imagekit') {
        const p = new ImageKitStorageProvider(credentials);
        return p.verify();
    } else if (provider === 's3') {
        const p = new S3StorageProvider(credentials);
        return p.verify();
    }
    return { success: false, error: `Unknown storage provider: ${provider}` };
}

export function getStorageProvider(customConfig?: { provider: string; credentials: any } | null): StorageProvider {
    if (customConfig && customConfig.provider === 's3' && customConfig.credentials) {
        return new S3StorageProvider(customConfig.credentials);
    }
    if (customConfig && customConfig.provider === 'imagekit' && customConfig.credentials) {
        return new ImageKitStorageProvider(customConfig.credentials);
    }
    if (customConfig && customConfig.provider === 'cloudinary' && customConfig.credentials) {
        return new CloudinaryStorageProvider(customConfig.credentials);
    }

    // Default platform Cloudinary fallback
    if (
        (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) ||
        process.env.CLOUDINARY_URL
    ) {
        return new CloudinaryStorageProvider();
    }

    return new LocalStorageProvider();
}
