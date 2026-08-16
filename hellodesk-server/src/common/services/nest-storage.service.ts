import { Injectable } from '@nestjs/common';
import { StorageProvider, LocalStorageProvider } from '../../services/storage.service.js';

@Injectable()
export class NestStorageService {
    private provider: StorageProvider;

    constructor() {
        this.provider = new LocalStorageProvider();
    }

    async uploadFile(file: any): Promise<{ url: string; mediaType: string }> {
        return this.provider.uploadFile(file);
    }
}
