import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Response } from 'express';

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

  // GET /stats/me/export.csv
  @Get('stats/me/export')
  async exportCsv(@Req() req, @Res() res: Response) {
    const csv = await this.statisticsService.exportUserAnalysesCsv(
      req.user.userId,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="interview-coach-analyses.csv"',
    );
    res.send(csv);
  }

  // GET /stats/me/peer
  @Get('stats/me/peer')
  getPeerStatistics(@Req() req) {
    return this.statisticsService.getPeerStatistics(req.user.userId);
  }
}
