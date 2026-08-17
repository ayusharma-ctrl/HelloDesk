import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller.js';
import { LlmService } from './llm.service.js';
import { LlmRepository } from './llm.repository.js';

import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
    imports: [PermissionsModule],
    controllers: [LlmController],
    providers: [LlmService, LlmRepository],
    exports: [LlmService, LlmRepository],
})
export class LlmModule {}
