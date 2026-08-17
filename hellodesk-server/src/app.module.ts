import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { KbModule } from './modules/kb/kb.module.js';
import { WidgetModule } from './modules/widget/widget.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { DomainsModule } from './modules/domains/domains.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ThemeModule } from './modules/theme/theme.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { LlmModule } from './modules/llm/llm.module.js';
import { HealthController } from './common/controllers/health.controller.js';
import { EventsGateway } from './events.gateway.js';
import { TokenBucketRateLimiterMiddleware } from './common/middleware/rate-limiter.middleware.js';

import { PermissionsModule } from './modules/permissions/permissions.module.js';

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        UsersModule,
        ConversationsModule,
        KbModule,
        WidgetModule,
        WebhooksModule,
        DomainsModule,
        AgentsModule,
        DashboardModule,
        ThemeModule,
        UploadModule,
        LlmModule,
        PermissionsModule,
    ],
    controllers: [HealthController],
    providers: [EventsGateway],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(TokenBucketRateLimiterMiddleware).forRoutes('*');
    }
}
