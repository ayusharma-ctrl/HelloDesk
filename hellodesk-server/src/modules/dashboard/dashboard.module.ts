import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardRepository } from './dashboard.repository.js';

import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
    imports: [PermissionsModule],
    controllers: [DashboardController],
    providers: [DashboardService, DashboardRepository],
    exports: [DashboardService, DashboardRepository],
})
export class DashboardModule {}
