import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ErrorCode } from '../enums/error-codes.enum';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function createHost(json = jest.fn(), status = jest.fn(() => ({ json }))) {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          headers: { 'x-request-id': 'req-123' },
        }),
      }),
    } as unknown as ArgumentsHost;
  }

  it('preserves explicit error codes and details', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = createHost(json, status);
    const exception = new UnauthorizedException({
      code: ErrorCode.AUTH_INVALID_CREDENTIALS,
      message: 'Invalid credentials',
      details: { field: 'email' },
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: ErrorCode.AUTH_INVALID_CREDENTIALS,
          message: 'Invalid credentials',
          details: { field: 'email' },
        },
        requestId: 'req-123',
      }),
    );
  });

  it('normalizes validation payload arrays into a stable envelope', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = createHost(json, status);
    const exception = new BadRequestException({
      message: ['email must be an email', 'password is too short'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'email must be an email, password is too short',
          details: null,
        },
      }),
    );
  });

  it('maps plain not-found exceptions to a stable default code', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = createHost(json, status);

    filter.catch(new NotFoundException('User not found'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: ErrorCode.USER_NOT_FOUND,
          message: 'User not found',
          details: null,
        },
      }),
    );
  });

  it('maps unknown errors to the internal error envelope', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = createHost(json, status);

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error',
          details: null,
        },
      }),
    );
  });
});
