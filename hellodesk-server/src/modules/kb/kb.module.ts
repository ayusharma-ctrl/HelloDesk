import { Module } from '@nestjs/common';
import { KbController } from './kb.controller.js';
import { KbService } from './kb.service.js';
import { KbRepository } from './kb.repository.js';

@Module({
    controllers: [KbController],
    providers: [KbService, KbRepository],
    exports: [KbService, KbRepository],
})
export class KbModule {}
