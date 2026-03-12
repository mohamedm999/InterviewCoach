import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { INestApplication, Logger } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const logger = new Logger('Swagger');
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  const port = configService.get<number>('port') ?? 3000;
  const swaggerEnabled = configService.get<boolean>('swagger.enabled') ?? false;
  const swaggerPath = configService.get<string>('swagger.path') || 'api/docs';

  if (!swaggerEnabled) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('InterviewCoach API')
    .setDescription(
      'AI-powered interview preparation platform API. ' +
        'This API provides endpoints for user authentication, analysis creation, ' +
        'recommendations, statistics, goals tracking, and admin operations.',
    )
    .setVersion('1.0')
    .setContact(
      'InterviewCoach Support',
      'https://interviewcoach.app',
      'support@interviewcoach.app',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User profile and account management')
    .addTag('Analyses', 'Interview response analysis and feedback')
    .addTag('Recommendations', 'AI-powered improvement recommendations')
    .addTag('Statistics', 'User progress and performance statistics')
    .addTag('Goals', 'Personal improvement goals tracking')
    .addTag('Templates', 'Pitch templates for different contexts')
    .addTag('Admin - Users', 'Admin user management operations')
    .addTag('Admin - Config', 'Admin configuration management')
    .addTag('Admin - Statistics', 'Admin analytics and reporting')
    .addTag('Admin - Audit Logs', 'Admin audit log access')
    .addServer(
      nodeEnv === 'production'
        ? 'https://api.interviewcoach.app/api/v1'
        : `http://localhost:${port}/api/v1`,
      nodeEnv === 'production' ? 'Production' : 'Development',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerPath, app, document, {
    customSiteTitle: 'InterviewCoach API Documentation',
    customfavIcon: 'https://interviewcoach.app/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { font-size: 36px }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  logger.log(`Swagger documentation available at: /${swaggerPath}`);
}
