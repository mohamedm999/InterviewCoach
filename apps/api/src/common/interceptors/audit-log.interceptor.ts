import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
} from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap(async (response) => {
        try {
          const entityId = response?.id || request.params?.id || null;

          await this.auditLogsService.create({
            actorUserId: user.userId,
            action: auditMetadata.action,
            entityType: auditMetadata.entityType,
            entityId,
            metadata: {
              method: request.method,
              url: request.url,
              body: this.sanitizeBody(request.body),
            },
            ipAddress: request.ip || request.connection?.remoteAddress,
            userAgent: request.headers['user-agent'],
          });
        } catch (error) {
          this.logger.error('Failed to create audit log', error);
        }

        return response;
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      'currentPassword',
      'newPassword',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
