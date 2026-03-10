import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('analyses')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // GET /analyses/:id/recommendations
  @Get(':id/recommendations')
  findByAnalysis(@Req() req, @Param('id', ParseUUIDPipe) analysisId: string) {
    return this.recommendationsService.findByAnalysis(
      analysisId,
      req.user.userId,
      req.user.role,
    );
  }
}
