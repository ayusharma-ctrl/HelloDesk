import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';

import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
    imports: [PermissionsModule],
    controllers: [AuthController],
    providers: [AuthService, AuthRepository],
    exports: [AuthService, AuthRepository],
})
export class AuthModule {}
