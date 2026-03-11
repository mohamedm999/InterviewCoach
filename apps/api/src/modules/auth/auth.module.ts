import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LoginAttemptTrackerService } from '../../common/services/login-attempt-tracker.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        ({
          secret: config.get<string>('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: config.get<string>('JWT_ACCESS_TTL', '15m'),
          },
        }) as any,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    LoginAttemptTrackerService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
