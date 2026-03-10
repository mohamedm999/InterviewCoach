import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsNumber, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WeightsDto {
  @IsNumber() @Min(0) @Max(100) tone: number;
  @IsNumber() @Min(0) @Max(100) confidence: number;
  @IsNumber() @Min(0) @Max(100) readability: number;
  @IsNumber() @Min(0) @Max(100) impact: number;
}

class ThresholdsDto {
  @IsInt() @Min(1) @Max(98) high: number;
  @IsInt() @Min(2) @Max(99) medium: number;
}

class UpdateConfigDto {
  @ValidateNested() @Type(() => WeightsDto) weights: WeightsDto;
  @ValidateNested() @Type(() => ThresholdsDto) thresholds: ThresholdsDto;
}

@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminConfigController {
  constructor(private readonly adminConfigService: AdminConfigService) {}

  // GET /admin/config
  @Get()
  getConfig() {
    return this.adminConfigService.getConfig();
  }

  // PUT /admin/config
  @Put()
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.adminConfigService.updateConfig(dto);
  }
}
