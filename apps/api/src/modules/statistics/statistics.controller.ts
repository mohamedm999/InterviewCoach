import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
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
    const csv = await this.statisticsService.exportUserAnalysesCsv(req.user.userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="interview-coach-analyses.csv"');
    res.send(csv);
  }

  // GET /stats/me/peer
  @Get('stats/me/peer')
  getPeerStatistics(@Req() req) {
    return this.statisticsService.getPeerStatistics(req.user.userId);
  }

  // GET /stats/me/goals
  @Get('stats/me/goals')
  getGoals(@Req() req) {
    return this.statisticsService.getGoals(req.user.userId);
  }

  // POST /stats/me/goals
  @Post('stats/me/goals')
  createGoal(@Req() req, @Body() body: { targetScore: number; category?: string; deadline?: string }) {
    return this.statisticsService.createGoal(req.user.userId, body);
  }

  // PATCH /stats/me/goals/:id
  @Patch('stats/me/goals/:id')
  updateGoal(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { targetScore?: number; category?: string; deadline?: string; isCompleted?: boolean },
  ) {
    return this.statisticsService.updateGoal(req.user.userId, id, body);
  }

  // DELETE /stats/me/goals/:id
  @Delete('stats/me/goals/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGoal(@Req() req, @Param('id') id: string) {
    return this.statisticsService.deleteGoal(req.user.userId, id);
  }
}
