import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { getStorageProvider } from '../../services/storage.service.js';

@Controller('upload')
export class UploadController {
    @Post()
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
    async uploadFile(@UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const storage = getStorageProvider();
        const result = await storage.uploadFile(file);
        return result;
    }
}
