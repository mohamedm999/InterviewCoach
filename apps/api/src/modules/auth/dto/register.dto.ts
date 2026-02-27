import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { RegisterDto as SharedRegisterDto } from '@interviewcoach/shared';

export class RegisterDto implements SharedRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least 1 uppercase letter and 1 number',
  })
  password: string;
}
