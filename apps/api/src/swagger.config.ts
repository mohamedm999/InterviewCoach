import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
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
      process.env.NODE_ENV === 'production' 
        ? 'https://api.interviewcoach.app/api/v1'
        : `http://localhost:${process.env.PORT || 3001}/api/v1`,
      process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(process.env.SWAGGER_PATH || 'api/docs', app, document, {
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

  console.log(`📚 Swagger documentation available at: /${process.env.SWAGGER_PATH || 'api/docs'}`);
}
