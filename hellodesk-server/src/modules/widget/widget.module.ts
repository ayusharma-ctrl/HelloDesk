import { Module } from '@nestjs/common';
import { WidgetController } from './widget.controller.js';
import { WidgetService } from './widget.service.js';
import { WidgetRepository } from './widget.repository.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';

@Module({
    controllers: [WidgetController],
    providers: [WidgetService, WidgetRepository, RateLimitGuard],
    exports: [WidgetService, WidgetRepository],
})
export class WidgetModule {}
