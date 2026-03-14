import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { MAX_PITCH_LENGTH, MIN_PITCH_LENGTH } from '@interviewcoach/shared';
import { Context } from '@prisma/client';

export class CreateAnalysisDto {
  @IsEnum(Context)
  context: Context;

  @IsString()
  @MinLength(MIN_PITCH_LENGTH)
  @MaxLength(MAX_PITCH_LENGTH)
  content: string;
}
