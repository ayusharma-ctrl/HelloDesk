import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { logger } from './lib/logger.js';
import { exec } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { startAiWorkers } from './services/ai.worker.js';
import { getIoInstance } from './lib/socket-instance.js';

import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    app.useGlobalFilters(new AllExceptionsFilter());

    app.enableCors({
        origin: true,
        credentials: true,
    });

    app.setGlobalPrefix('api/v1');

    // Serve static uploaded media files
    app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });

    const port = process.env.PORT || 3001;

    await app.listen(port);
    logger.info({ port }, 'HelloDesk NestJS server listening on Node 24.19.0 LTS');

    // Initialize BullMQ Workers with Socket.io server reference
    const io = getIoInstance();
    if (io) {
        startAiWorkers(io);
    }

    // Run Prisma auto-migrations on server boot
    exec('npx prisma migrate deploy', (error, stdout) => {
        if (error) {
            logger.error({ error }, 'Prisma auto-migration error');
        } else {
            logger.info({ stdout: stdout.trim() }, 'Prisma auto-migration completed');
        }
    });
}

bootstrap();
