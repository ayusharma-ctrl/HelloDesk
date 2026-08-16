import { Module } from '@nestjs/common';
import { WidgetController } from './widget.controller.js';
import { WidgetService } from './widget.service.js';
import { WidgetRepository } from './widget.repository.js';

@Module({
    controllers: [WidgetController],
    providers: [WidgetService, WidgetRepository],
    exports: [WidgetService, WidgetRepository],
})
export class WidgetModule {}
