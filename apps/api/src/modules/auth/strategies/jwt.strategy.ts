import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

function readCookie(req: Request, key: string): string | null {
  if (req.cookies?.[key]) {
    return req.cookies[key];
  }

  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));

  if (!match) {
    return null;
  }

  const [, value = ''] = match.split('=');
  return decodeURIComponent(value);
}

export function extractAccessToken(req: Request): string | null {
  const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (bearerToken) {
    return bearerToken;
  }

  return readCookie(req, 'accessToken');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractAccessToken,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
    } as any);
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new UnauthorizedException();
    }

    // Return object attached to req.user
    return { userId: user.id, email: user.email, role: user.role };
  }
}
