import {
  IsOptional,
  IsString,
  MaxLength,
  IsUrl,
  MinLength,
  IsEmail,
} from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '@interviewcoach/shared';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  currentPassword: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword: string;
}
