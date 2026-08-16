import { Module } from '@nestjs/common';
import { ThemeController } from './theme.controller.js';
import { ThemeService } from './theme.service.js';
import { ThemeRepository } from './theme.repository.js';

@Module({
    controllers: [ThemeController],
    providers: [ThemeService, ThemeRepository],
    exports: [ThemeService, ThemeRepository],
})
export class ThemeModule {}
