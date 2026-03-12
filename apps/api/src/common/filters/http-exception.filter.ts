import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { ApiErrorEnvelope, ApiErrorPayload } from '@interviewcoach/shared';
import { Request, Response } from 'express';
import { ErrorCode } from '../enums/error-codes.enum';
import * as Sentry from '@sentry/node';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.buildPayload(exception, status, request);
    this.reportException(exception, status, request, payload.error.code);
    response.status(status).json(payload);
  }

  private buildPayload(
    exception: unknown,
    status: number,
    request: Request,
  ): ApiErrorEnvelope {
    const normalized = this.normalizeError(exception, status);

    return {
      success: false,
      error: normalized,
      requestId: this.resolveRequestId(request),
      timestamp: new Date().toISOString(),
    };
  }

  private normalizeError(exception: unknown, status: number): ApiErrorPayload {
    if (!(exception instanceof HttpException)) {
      return {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
        details: null,
      };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        code: this.defaultCodeFor(exception, status),
        message: response,
        details: null,
      };
    }

    if (Array.isArray(response)) {
      return {
        code: this.defaultCodeFor(exception, status),
        message: response.join(', '),
        details: response,
      };
    }

    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      const details = this.extractDetails(payload);
      const message = this.extractMessage(payload, details);

      return {
        code: this.extractCode(payload, exception, status),
        message,
        details,
      };
    }

    return {
      code: this.defaultCodeFor(exception, status),
      message: exception.message || 'Request failed',
      details: null,
    };
  }

  private extractCode(
    payload: Record<string, unknown>,
    exception: HttpException,
    status: number,
  ): string {
    if (typeof payload.code === 'string' && payload.code.length > 0) {
      return payload.code;
    }

    return this.defaultCodeFor(exception, status);
  }

  private extractMessage(
    payload: Record<string, unknown>,
    details: unknown,
  ): string {
    if (typeof payload.message === 'string' && payload.message.length > 0) {
      return payload.message;
    }

    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    if (Array.isArray(details)) {
      return details.join(', ');
    }

    return 'Request failed';
  }

  private extractDetails(payload: Record<string, unknown>): unknown {
    if ('details' in payload) {
      return payload.details ?? null;
    }

    const details = { ...payload };
    delete details.code;
    delete details.message;
    delete details.error;
    delete details.statusCode;

    return Object.keys(details).length > 0 ? details : null;
  }

  private defaultCodeFor(exception: HttpException, status: number): string {
    if (
      exception instanceof BadRequestException &&
      Array.isArray((exception.getResponse() as { message?: unknown })?.message)
    ) {
      return ErrorCode.VALIDATION_FAILED;
    }

    if (exception instanceof UnauthorizedException) {
      return ErrorCode.AUTH_TOKEN_INVALID;
    }

    if (exception instanceof ForbiddenException) {
      return ErrorCode.PERMISSION_DENIED;
    }

    if (exception instanceof NotFoundException) {
      return ErrorCode.USER_NOT_FOUND;
    }

    if (status >= 500) {
      return ErrorCode.INTERNAL_ERROR;
    }

    if (status === HttpStatus.BAD_REQUEST) {
      return ErrorCode.VALIDATION_FAILED;
    }

    return ErrorCode.INTERNAL_ERROR;
  }

  private resolveRequestId(request: Request): string {
    const requestId = (request as Request & { requestId?: string }).requestId
      || request.headers['x-request-id'];
    if (typeof requestId === 'string' && requestId.length > 0) {
      return requestId;
    }

    if (Array.isArray(requestId) && requestId[0]) {
      return requestId[0];
    }

    return 'unknown';
  }

  private reportException(
    exception: unknown,
    status: number,
    request: Request & { requestId?: string; user?: { userId?: string } },
    errorCode: string,
  ) {
    const requestId = this.resolveRequestId(request);
    const actorUserId = request.user?.userId;
    const route = request.route?.path || request.originalUrl || request.url;

    this.logger.error(
      `[${requestId}] ${request.method} ${route} failed status=${status} code=${errorCode} actor=${actorUserId || 'anonymous'}`,
    );

    if (status < 500) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setTag('request_id', requestId);
      scope.setTag('error_code', errorCode);
      scope.setTag('http_method', request.method);
      scope.setTag('http_route', route);
      if (actorUserId) {
        scope.setUser({ id: actorUserId });
      }
      scope.setContext('request', {
        requestId,
        method: request.method,
        route,
        actorUserId: actorUserId || null,
      });
      Sentry.captureException(
        exception instanceof Error ? exception : new Error(String(exception)),
      );
    });
  }
}
