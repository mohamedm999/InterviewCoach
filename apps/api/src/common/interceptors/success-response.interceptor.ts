import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { ApiSuccessEnvelope } from '@interviewcoach/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data): unknown => {
        if (response.headersSent) {
          return data;
        }

        if (
          data instanceof StreamableFile ||
          Buffer.isBuffer(data) ||
          (data && typeof data === 'object' && 'pipe' in (data as object))
        ) {
          return data;
        }

        if (
          data &&
          typeof data === 'object' &&
          'success' in (data as Record<string, unknown>)
        ) {
          return data;
        }

        const envelope: ApiSuccessEnvelope<unknown> = {
          success: true,
          data: data ?? null,
        };

        return envelope;
      }),
    );
  }
}
