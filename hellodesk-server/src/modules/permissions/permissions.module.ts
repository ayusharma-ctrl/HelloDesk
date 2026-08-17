import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsService } from './permissions.service.js';

import { PermissionsGuard } from '../../common/guards/permissions.guard.js';

@Module({
    controllers: [PermissionsController],
    providers: [PermissionsService, PermissionsGuard],
    exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
