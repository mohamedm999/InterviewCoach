import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { MailService } from '../mail/mail.service';
import { LoginAttemptTrackerService } from '../../common/services/login-attempt-tracker.service';
import { ErrorCode } from '../../common/enums/error-codes.enum';
import { hash, verify } from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AuthSessionResult } from './auth.types';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly attemptTracker: LoginAttemptTrackerService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthSessionResult> {
    // 1. Check if email exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // 2. Hash password
    const passwordHash = await hash(dto.password);

    // 3. Build displayName from firstName + lastName
    const displayName =
      dto.firstName && dto.lastName
        ? `${dto.firstName} ${dto.lastName}`
        : dto.firstName || dto.lastName || null;

    // 4. Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // 5. Generate tokens and persist refresh token
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    // 6. Send verification email
    const verToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.verificationToken.create({
      data: { userId: user.id, token: verToken, expiresAt },
    });
    this.mailService
      .sendVerificationEmail(user.email, verToken)
      .catch(() => {});

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthSessionResult> {
    // Check if account is locked due to brute force attempts
    if (this.attemptTracker.isLocked(dto.email)) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_ACCOUNT_LOCKED,
        message: 'Account temporarily locked due to too many failed attempts',
      });
    }

    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.attemptTracker.recordFailedAttempt(dto.email);
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    // 2. Check status
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_ACCOUNT_SUSPENDED,
        message: 'Account is suspended or banned',
      });
    }

    // 3. Verify password
    let valid = false;
    try {
      valid = await verify(user.passwordHash, dto.password);
    } catch {
      this.attemptTracker.recordFailedAttempt(dto.email);
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    if (!valid) {
      this.attemptTracker.recordFailedAttempt(dto.email);
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    // 4. Clear failed attempts on successful login
    this.attemptTracker.resetAttempts(dto.email);

    // 5. Update lastLoginAt
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Generate tokens and persist refresh token
    const tokens = await this.generateTokens(updatedUser.id, updatedUser.email, updatedUser.role);
    await this.persistRefreshToken(updatedUser.id, tokens.refreshToken);

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        emailVerified: updatedUser.emailVerified,
        role: updatedUser.role,
        status: updatedUser.status,
      },
      ...tokens,
    };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto): Promise<AuthSessionResult> {
    try {
      if (!dto.refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }

      // 1. Verify refresh token JWT signature + expiry
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      // 2. Hash the incoming token and look it up in DB
      const tokenHash = this.hashToken(dto.refreshToken);
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          tokenHash,
          isRevoked: false,
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }

      // 3. Check expiry in DB
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // 4. Revoke the old refresh token (rotation)
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      // 5. Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (
        !user ||
        user.status === 'SUSPENDED' ||
        user.status === 'BANNED'
      ) {
        throw new UnauthorizedException('User not found or suspended');
      }

      // 6. Generate new tokens and persist new refresh token
      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.persistRefreshToken(user.id, tokens.refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          role: user.role,
          status: user.status,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── Email Verification ───────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
    await this.prisma.verificationToken.delete({ where: { token } });
  }

  // ─── Password Reset ───────────────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // silent — don't expose whether email exists
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });
    await this.mailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await hash(newPassword);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await this.prisma.passwordResetToken.delete({ where: { token } });
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke the specific refresh token
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, isRevoked: false },
        data: { isRevoked: true },
      });
    } else {
      // Revoke all refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async persistRefreshToken(
    userId: string,
    rawRefreshToken: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    const expiresAt = this.computeExpiryDate(refreshTtl);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  private computeExpiryDate(ttl: string): Date {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * (multipliers[unit] || multipliers.d));
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(
      payload as any,
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
      } as any,
    );

    const refreshToken = await this.jwtService.signAsync(
      payload as any,
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
      } as any,
    );

    return { accessToken, refreshToken };
  }
}
