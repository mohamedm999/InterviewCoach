import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  // GET /stats/me/progression
  @Get('stats/me/progression')
  getUserProgression(@Req() req) {
    return this.statisticsService.getUserProgression(req.user.userId);
  }

  // GET /admin/stats/overview
  @Get('admin/stats/overview')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAdminOverview() {
    return this.statisticsService.getAdminOverview();
  }

  // GET /admin/stats/by-context
  @Get('admin/stats/by-context')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getStatsByContext() {
    return this.statisticsService.getStatsByContext();
  }
}
