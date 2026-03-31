import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Role, UserStatus } from '@prisma/client';
import { BasePaginationDto } from '../../../common/dto/base-pagination.dto';

export class PaginationQueryDto extends BasePaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
