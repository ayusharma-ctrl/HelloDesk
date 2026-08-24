import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { testStorageCredentials } from '../../services/storage.service.js';
import { verifyStorageDto, saveStorageConfigDto } from './storage.dto.js';

@Injectable()
export class StorageService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async getConfig(workspaceId: string) {
        const config = await this.prisma.workspaceStorageConfig.findUnique({
            where: { workspaceId },
        });

        if (!config) {
            return {
                provider: 'default_cloudinary',
                isCustom: false,
                credentials: null,
            };
        }

        const creds = config.credentials as any;
        const maskedCreds: Record<string, string> = {};

        if (config.provider === 'cloudinary') {
            maskedCreds.cloudName = creds.cloudName || '';
            maskedCreds.apiKey = creds.apiKey ? `${creds.apiKey.substring(0, 4)}••••••••` : '';
            maskedCreds.apiSecret = creds.apiSecret ? `••••••••${creds.apiSecret.slice(-4)}` : '';
        } else if (config.provider === 'imagekit') {
            maskedCreds.publicKey = creds.publicKey ? `${creds.publicKey.substring(0, 8)}••••••••` : '';
            maskedCreds.privateKey = creds.privateKey ? `••••••••${creds.privateKey.slice(-4)}` : '';
            maskedCreds.urlEndpoint = creds.urlEndpoint || '';
        } else if (config.provider === 's3') {
            maskedCreds.bucketName = creds.bucketName || '';
            maskedCreds.region = creds.region || '';
            maskedCreds.accessKeyId = creds.accessKeyId ? `${creds.accessKeyId.substring(0, 4)}••••••••` : '';
            maskedCreds.secretAccessKey = creds.secretAccessKey ? `••••••••${creds.secretAccessKey.slice(-4)}` : '';
            maskedCreds.endpoint = creds.endpoint || '';
        }

        return {
            id: config.id,
            provider: config.provider,
            isCustom: true,
            credentials: maskedCreds,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        };
    }

    async verifyConfig(body: any) {
        const input = verifyStorageDto.parse(body);

        if (input.provider === 'cloudinary') {
            const { cloudName, apiKey, apiSecret } = input.credentials;
            if (!cloudName || !apiKey || !apiSecret) {
                throw new BadRequestException('Cloudinary requires cloudName, apiKey, and apiSecret');
            }
        } else if (input.provider === 'imagekit') {
            const { publicKey, privateKey, urlEndpoint } = input.credentials;
            if (!publicKey || !privateKey || !urlEndpoint) {
                throw new BadRequestException('ImageKit requires publicKey, privateKey, and urlEndpoint');
            }
        } else if (input.provider === 's3') {
            const { bucketName, region, accessKeyId, secretAccessKey } = input.credentials;
            if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
                throw new BadRequestException('AWS S3 requires bucketName, region, accessKeyId, and secretAccessKey');
            }
        }

        const result = await testStorageCredentials(input.provider, input.credentials);
        if (!result.success) {
            throw new BadRequestException(result.error || 'Failed to verify storage credentials');
        }

        return { verified: true, message: `Successfully connected and verified ${input.provider} credentials.` };
    }

    async saveConfig(workspaceId: string, body: any) {
        const input = saveStorageConfigDto.parse(body);

        // Run mandatory pre-flight live verification
        await this.verifyConfig(input);

        // Upsert workspace storage configuration
        const config = await this.prisma.workspaceStorageConfig.upsert({
            where: { workspaceId },
            create: {
                workspaceId,
                provider: input.provider,
                credentials: input.credentials,
                isActive: true,
            },
            update: {
                provider: input.provider,
                credentials: input.credentials,
                isActive: true,
            },
        });

        return {
            success: true,
            provider: config.provider,
            message: `Custom ${config.provider} storage provider activated for workspace.`,
        };
    }

    async deleteConfig(workspaceId: string) {
        await this.prisma.workspaceStorageConfig.deleteMany({
            where: { workspaceId },
        });

        return {
            success: true,
            message: 'Custom storage provider removed. Reverted to platform default Cloudinary.',
        };
    }
}
