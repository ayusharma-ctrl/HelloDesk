import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsModule } from '../permissions/permissions.module.js';

@Global()
@Module({
    imports: [PermissionsModule],
    controllers: [AuthController],
    providers: [AuthService, AuthRepository, JwtAuthGuard],
    exports: [AuthService, AuthRepository, JwtAuthGuard],
})
export class AuthModule {}
