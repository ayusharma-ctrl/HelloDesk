import { Module } from '@nestjs/common';
import { KbController } from './kb.controller.js';
import { KbService } from './kb.service.js';
import { KbRepository } from './kb.repository.js';

import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
    imports: [PermissionsModule],
    controllers: [KbController],
    providers: [KbService, KbRepository],
    exports: [KbService, KbRepository],
})
export class KbModule {}
