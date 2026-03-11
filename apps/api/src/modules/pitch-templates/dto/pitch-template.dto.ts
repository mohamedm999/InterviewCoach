import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Context } from '@prisma/client';

export class CreatePitchTemplateDto {
  @IsString()
  title: string;

  @IsEnum(Context)
  context: Context;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePitchTemplateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(Context)
  @IsOptional()
  context?: Context;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
