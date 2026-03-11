import { IsInt, IsString, IsOptional, IsBoolean, Min, Max, IsDateString } from 'class-validator';

export class CreateGoalDto {
  @IsInt()
  @Min(0)
  @Max(100)
  targetScore: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  targetScore?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
