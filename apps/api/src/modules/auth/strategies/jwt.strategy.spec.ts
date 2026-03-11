import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, extractAccessToken } from './jwt.strategy';

describe('extractAccessToken', () => {
  it('returns the bearer token when present', () => {
    const token = extractAccessToken({
      headers: {
        authorization: 'Bearer access-token',
      },
    } as any);

    expect(token).toBe('access-token');
  });

  it('returns the access token from cookies when no bearer header is present', () => {
    const token = extractAccessToken({
      cookies: {
        accessToken: 'cookie-token',
      },
      headers: {},
    } as any);

    expect(token).toBe('cookie-token');
  });
});

describe('JwtStrategy', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const config = {
    get: jest.fn().mockReturnValue('access-secret'),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects banned users during cookie-backed auth validation', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      role: 'USER',
      status: 'BANNED',
    });

    const strategy = new JwtStrategy(config, prisma as any);

    await expect(
      strategy.validate({ sub: 'user-id', email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
