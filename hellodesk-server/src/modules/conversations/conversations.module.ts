import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { ConversationsRepository } from './conversations.repository.js';

import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
    imports: [PermissionsModule],
    controllers: [ConversationsController],
    providers: [ConversationsService, ConversationsRepository],
    exports: [ConversationsService, ConversationsRepository],
})
export class ConversationsModule {}
