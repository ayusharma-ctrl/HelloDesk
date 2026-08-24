import { Module, Global } from '@nestjs/common';
import { EmailController } from './email.controller.js';
import { WorkspaceEmailService } from './email.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [EmailController],
    providers: [WorkspaceEmailService],
    exports: [WorkspaceEmailService],
})
export class EmailModule {}
