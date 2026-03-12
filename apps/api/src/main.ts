// IMPORTANT: Import Sentry instrumentation first, before any other imports
import './instrument';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins =
    config.get<string[]>('cors.origins') || ['http://localhost:3001'];
  const maxFileSizeBytes = config.get<number>('upload.maxFileSize') ?? 1048576;
  const port = config.get<number>('port') ?? 3000;
  const maxBodySize = `${maxFileSizeBytes}b`;

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet());
  app.use((req: any, res, next) => {
    const incomingRequestId = req.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' && incomingRequestId.length > 0
        ? incomingRequestId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
  app.enableCors({
    origin: corsOrigins,
    exposedHeaders: ['x-request-id'],
    credentials: true,
  });
  app.use(json({ limit: maxBodySize }));
  app.use(
    urlencoded({
      extended: true,
      limit: maxBodySize,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  await app.listen(port);
  logger.log(`API running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
