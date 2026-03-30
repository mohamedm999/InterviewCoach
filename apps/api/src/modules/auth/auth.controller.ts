import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { Request, Response } from 'express';
import { AuthSessionResult } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieSecurity() {
    const isProduction =
      (this.configService.get<string>('nodeEnv') || 'development') ===
      'production';
    return {
      isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    };
  }

  private setSessionCookies(res: Response, session: AuthSessionResult) {
    const { isProduction, sameSite } = this.getCookieSecurity();

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
    const { isProduction, sameSite } = this.getCookieSecurity();

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
  @AuditLog('USER_LOGOUT', 'User')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const refreshToken =
      body.refreshToken || this.getCookieValue(req, 'refreshToken');
    await this.authService.logoutByRefreshToken(refreshToken);
    this.clearSessionCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(dto.email);
    return {
      message:
        'If your account exists and is unverified, a new verification email has been sent.',
    };
  }
}
