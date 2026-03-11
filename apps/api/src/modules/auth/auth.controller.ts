import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { Request, Response } from 'express';
import { AuthSessionResult } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookies(res: Response, session: AuthSessionResult) {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = isProduction ? 'none' : 'lax';

    res.cookie('accessToken', session.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', session.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearSessionCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = isProduction ? 'none' : 'lax';

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
    });
  }

  private getCookieValue(req: Request, key: string): string | undefined {
    if (req.cookies?.[key]) {
      return req.cookies[key];
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    const match = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`));

    if (!match) {
      return undefined;
    }

    const [, value = ''] = match.split('=');
    return decodeURIComponent(value);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @AuditLog('USER_REGISTER', 'User')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.authService.register(dto);
    this.setSessionCookies(res, session);
    return { user: session.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuditLog('USER_LOGIN', 'User')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.authService.login(dto);
    this.setSessionCookies(res, session);
    return { user: session.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.authService.refresh({
      refreshToken:
        dto?.refreshToken || this.getCookieValue(req, 'refreshToken') || '',
    });
    this.setSessionCookies(res, session);
    return { user: session.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @AuditLog('USER_LOGOUT', 'User')
  async logout(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    await this.authService.logout(
      req.user.userId,
      body.refreshToken || this.getCookieValue(req as Request, 'refreshToken'),
    );
    this.clearSessionCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() body: { email: string }) {
    await this.authService.requestPasswordReset(body.email);
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(@Body() body: { token: string }) {
    await this.authService.verifyEmail(body.token);
  }
}
