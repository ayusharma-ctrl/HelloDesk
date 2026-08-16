import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import { WebhooksRepository } from './webhooks.repository.js';

@Module({
    controllers: [WebhooksController],
    providers: [WebhooksService, WebhooksRepository],
    exports: [WebhooksService, WebhooksRepository],
})
export class WebhooksModule {}
