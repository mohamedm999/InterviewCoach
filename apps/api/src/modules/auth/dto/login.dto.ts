import { IsEmail, IsString } from 'class-validator';
import { LoginDto as SharedLoginDto } from '@interviewcoach/shared';

export class LoginDto implements SharedLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
