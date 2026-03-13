import { IsEmail, IsString, MinLength } from 'class-validator';
import { LoginDto as SharedLoginDto, PASSWORD_MIN_LENGTH } from '@interviewcoach/shared';

export class LoginDto implements SharedLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password: string;
}
