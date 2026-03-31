import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { Role, UserStatus } from '@prisma/client';
import { MailService } from '../../mail/mail.service';
import { LoginAttemptTrackerService } from '../../../common/services/login-attempt-tracker.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    verificationToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockLoginAttemptTrackerService = {
    isLocked: jest.fn().mockReturnValue(false),
    recordFailedAttempt: jest.fn(),
    resetAttempts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
        {
          provide: LoginAttemptTrackerService,
          useValue: mockLoginAttemptTrackerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should hash password, create user, and return tokens', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const hashedPassword = 'hashed_password';
      const newUser: any = {
        id: 'user-id',
        email: registerDto.email,
        displayName: 'Test User',
        passwordHash: hashedPassword,
        role: 'USER' as Role,
        status: 'ACTIVE' as UserStatus,
        avatarUrl: null,
        emailVerified: true, // Set to true to allow login
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const tokens = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      // Mock config values
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL') return '7d';
        return null;
      });

      // Mock argon2 hash
      jest.spyOn(argon2, 'hash').mockResolvedValue(hashedPassword);

      // Mock database operations
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null); // No existing user
      jest.spyOn(prismaService.user, 'create').mockResolvedValue(newUser);
      jest
        .spyOn(mockPrismaService.verificationToken, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(mockPrismaService.refreshToken, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce(tokens.accessToken)
        .mockResolvedValueOnce(tokens.refreshToken);

      const result = await service.register(registerDto);

      expect(argon2.hash).toHaveBeenCalledWith(registerDto.password);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          passwordHash: hashedPassword,
          displayName: 'Test User',
          role: 'USER',
          status: 'ACTIVE',
        },
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        expect.any(String),
      );
    });

    it('should reject duplicate email on register', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const existingUser: any = {
        id: 'existing-user-id',
        email: registerDto.email,
        passwordHash: 'some_hash',
        role: 'USER' as Role,
        status: 'ACTIVE' as UserStatus,
        displayName: null,
        avatarUrl: null,
        emailVerified: true, // Set to true to allow login
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email already registered'),
      );
    });
  });

  describe('login', () => {
    it('should validate password and return tokens', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const user: any = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed_password',
        role: 'USER' as Role,
        status: 'ACTIVE' as UserStatus,
        displayName: null,
        avatarUrl: null,
        emailVerified: true, // Set to true to allow login
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const tokens = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      // Mock config values
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL') return '7d';
        return null;
      });

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(user);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      jest
        .spyOn(mockPrismaService.refreshToken, 'create')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(user);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce(tokens.accessToken)
        .mockResolvedValueOnce(tokens.refreshToken);

      const result = await service.login(loginDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        user.passwordHash,
        loginDto.password,
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should reject invalid password on login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const user: any = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed_password',
        role: 'USER' as Role,
        status: 'ACTIVE' as UserStatus,
        displayName: null,
        avatarUrl: null,
        emailVerified: true, // Set to true to allow login
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(user);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should return unauthorized when password hash verification throws', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const user: any = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'invalid_hash_value',
        role: 'USER' as Role,
        status: 'ACTIVE' as UserStatus,
        displayName: null,
        avatarUrl: null,
        emailVerified: true, // Set to true to allow login
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(user);
      jest
        .spyOn(argon2, 'verify')
        .mockRejectedValue(new Error('pchstr must contain a $ as first char'));

      await expect(service.login(loginDto)).rejects.toEqual(
        new UnauthorizedException({
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        }),
      );

      expect(
        mockLoginAttemptTrackerService.recordFailedAttempt,
      ).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw unauthorized exception if user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should rotate token and revoke old', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'old_refresh_token',
      };

      const decodedRefreshToken = {
        sub: 'user-id',
        email: 'test@example.com',
        role: 'USER',
      };

      const user: any = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        role: 'USER' as Role,
        status: 'ACTIVE' as UserStatus,
        displayName: null,
        avatarUrl: null,
        emailVerified: true, // Set to true to allow login
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const oldToken = {
        id: 'token-id',
        userId: 'user-id',
        tokenHash: 'hash_of_old_token',
        expiresAt: new Date(Date.now() + 86400000), // Valid token
        isRevoked: false,
        createdAt: new Date(),
      };

      const newTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };

      // Mock config values
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL') return '7d';
        return null;
      });

      jest
        .spyOn(jwtService, 'verify')
        .mockImplementation(() => decodedRefreshToken);
      jest
        .spyOn(prismaService.refreshToken, 'findFirst')
        .mockResolvedValue(oldToken as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(user);
      jest
        .spyOn(mockPrismaService.refreshToken, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce(newTokens.accessToken)
        .mockResolvedValueOnce(newTokens.refreshToken);

      const result = await service.refresh(refreshTokenDto);

      expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { isRevoked: true },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid_refresh_token',
      };

      const decodedRefreshToken = {
        sub: 'user-id',
        email: 'test@example.com',
        role: 'USER',
      };

      // Mock config values
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
        return null;
      });

      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });
});
