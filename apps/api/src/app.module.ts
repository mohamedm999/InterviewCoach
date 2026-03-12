import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnalysesModule } from './modules/analyses/analyses.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { PdfExportModule } from './modules/pdf-export/pdf-export.module';
import { AdminConfigModule } from './modules/admin-config/admin-config.module';
import { MailModule } from './modules/mail/mail.module';
import { PitchTemplatesModule } from './modules/pitch-templates/pitch-templates.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      load: [appConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    AnalysesModule,
    RecommendationsModule,
    StatisticsModule,
    PdfExportModule,
    AdminConfigModule,
    MailModule,
    PitchTemplatesModule,
    AuditLogsModule,
    GoalsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SuccessResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
