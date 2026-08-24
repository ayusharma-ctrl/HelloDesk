import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Req, Query, Body, Inject } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { getStorageProvider } from '../../services/storage.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { verifyToken } from '../../lib/auth.js';

@Controller('upload')
export class UploadController {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    @Post()
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
    async uploadFile(
        @UploadedFile() file: any,
        @Req() req: any,
        @Query('workspaceId') queryWsId?: string,
        @Body('workspaceId') bodyWsId?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        // Determine workspace ID from Authorization header or body/query params
        let targetWorkspaceId = queryWsId || bodyWsId;
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = verifyToken(token);
                if (decoded?.workspaceId) {
                    targetWorkspaceId = decoded.workspaceId;
                }
            } catch {}
        }

        let customConfig = null;
        if (targetWorkspaceId) {
            const config = await this.prisma.workspaceStorageConfig.findUnique({
                where: { workspaceId: targetWorkspaceId },
            });
            if (config && config.isActive) {
                customConfig = {
                    provider: config.provider,
                    credentials: config.credentials as any,
                };
            }
        }

        const storage = getStorageProvider(customConfig);
        const result = await storage.uploadFile(file);
        return result;
    }
}
