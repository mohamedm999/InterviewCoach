import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { Context } from '@prisma/client';

export class CreateAnalysisDto {
  @IsEnum(Context)
  context: Context;

  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  content: string;
}
