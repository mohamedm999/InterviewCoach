import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

function extractRefreshToken(req: Request): string | null {
  const fromBody = ExtractJwt.fromBodyField('refreshToken')(req);
  if (fromBody) {
    return fromBody;
  }

  if (req.cookies?.refreshToken) {
    return req.cookies.refreshToken;
  }

  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('refreshToken='));

  if (!match) {
    return null;
  }

  const [, value = ''] = match.split('=');
  return decodeURIComponent(value);
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    } as any);
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token malformed');
    }
    return { ...payload, refreshToken };
  }
}
