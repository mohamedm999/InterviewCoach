// IMPORTANT: Import Sentry instrumentation first, before any other imports
import './instrument';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
  });
  app.use(json({ limit: process.env.MAX_FILE_SIZE || '1mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: process.env.MAX_FILE_SIZE || '1mb',
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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
