import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const route = request.route?.path || request.originalUrl || url;
    const requestId = request.requestId || request.headers['x-request-id'] || 'unknown';
    const actorUserId = request.user?.userId || 'anonymous';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(
          `[${requestId}] ${method} ${route} ${duration}ms actor=${actorUserId}`,
        );
      }),
    );
  }
}
