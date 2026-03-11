import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalysesService } from './analyses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { AnalysisQueryDto } from './dto/analysis-query.dto';
import { AnalysisResponseDto } from './dto/analysis-response.dto';

@Controller('analyses')
@UseGuards(JwtAuthGuard)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  // POST /analyses - Limit to 5 analyses per minute per user
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(
    @Req() req,
    @Body() dto: CreateAnalysisDto,
  ): Promise<AnalysisResponseDto> {
    return this.analysesService.create(req.user.userId, dto);
  }

  // GET /analyses
  @Get()
  findAll(
    @Req() req,
    @Query() query: AnalysisQueryDto,
  ): Promise<{
    data: AnalysisResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.analysesService.findAll(req.user.userId, req.user.role, query);
  }

  // GET /analyses/:id
  @Get(':id')
  findOne(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnalysisResponseDto> {
    return this.analysesService.findOne(id, req.user.userId, req.user.role);
  }
}
