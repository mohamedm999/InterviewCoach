import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Context } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /stats/me/progression
  async getUserProgression(userId: string) {
    const analyses = await this.prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        scoreGlobal: true,
        scoreTone: true,
        scoreConfidence: true,
        scoreReadability: true,
        scoreImpact: true,
      },
    });

    return {
      data: analyses.map((a) => ({
        date: a.createdAt,
        scoreGlobal: a.scoreGlobal,
        scoreTone: a.scoreTone,
        scoreConfidence: a.scoreConfidence,
        scoreReadability: a.scoreReadability,
        scoreImpact: a.scoreImpact,
      })),
    };
  }

  // GET /admin/stats/overview
  async getAdminOverview() {
    const [totalAnalyses, totalUsers, activeUsers, allUserScores] =
      await Promise.all([
        this.prisma.analysis.count(),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        // Get first and last score per user to compute improvement rate
        this.prisma.$queryRaw<
          { userId: string; firstScore: number; lastScore: number }[]
        >`
        SELECT
          "userId",
          FIRST_VALUE("scoreGlobal") OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC) AS "firstScore",
          FIRST_VALUE("scoreGlobal") OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) AS "lastScore"
        FROM analyses
        GROUP BY "userId", "scoreGlobal", "createdAt"
      `,
      ]);

    // Average global score
    const avgResult = await this.prisma.analysis.aggregate({
      _avg: { scoreGlobal: true },
    });
    const averageScore = Math.round(avgResult._avg.scoreGlobal ?? 0);

    // Improvement rate: avg of (lastScore - firstScore) / max(1, nbAnalyses-1) per user
    // First, get per-user analysis counts
    const userAnalysisCounts = await this.prisma.analysis.groupBy({
      by: ['userId'],
      _count: { id: true },
    });
    const countMap = new Map<string, number>();
    for (const row of userAnalysisCounts) {
      countMap.set(row.userId, row._count.id);
    }

    const userMap = new Map<string, { first: number; last: number }>();
    for (const row of allUserScores) {
      if (!userMap.has(row.userId)) {
        userMap.set(row.userId, { first: row.firstScore, last: row.lastScore });
      }
    }
    const improvements = [...userMap.entries()].map(([userId, u]) => {
      const nbAnalyses = countMap.get(userId) || 1;
      return (u.last - u.first) / Math.max(1, nbAnalyses - 1);
    });
    const improvementRate =
      improvements.length > 0
        ? Math.round(
            improvements.reduce((a, b) => a + b, 0) / improvements.length,
          )
        : 0;

    return {
      totalAnalyses,
      averageScore,
      improvementRate,
      totalUsers,
      activeUsers,
    };
  }

  // GET /admin/stats/by-context
  async getStatsByContext() {
    const contexts = Object.values(Context);
    const result: Record<string, { count: number; avgScore: number }> = {};

    for (const ctx of contexts) {
      const agg = await this.prisma.analysis.aggregate({
        where: { context: ctx },
        _count: { id: true },
        _avg: { scoreGlobal: true },
      });
      result[ctx] = {
        count: agg._count.id,
        avgScore: Math.round(agg._avg.scoreGlobal ?? 0),
      };
    }

    return result;
  }

  // ─── CSV Export ─────────────────────────────────────────────────────────────

  async exportUserAnalysesCsv(userId: string): Promise<string> {
    const analyses = await this.prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { recommendations: true },
    });

    const header = [
      'Date', 'Context', 'Version',
      'Global Score', 'Tone', 'Confidence', 'Readability', 'Impact',
      'Recommendations Count', 'Input Text (truncated)'
    ].join(',');

    const rows = analyses.map((a) => [
      new Date(a.createdAt).toISOString(),
      a.context,
      a.versionIndex,
      a.scoreGlobal,
      a.scoreTone,
      a.scoreConfidence,
      a.scoreReadability,
      a.scoreImpact,
      a.recommendations.length,
      `"${(a.inputText || '').slice(0, 100).replace(/"/g, "'")}"`,
    ].join(','));

    return [header, ...rows].join('\n');
  }

  // ─── Peer Statistics ─────────────────────────────────────────────────────────

  async getPeerStatistics(userId: string) {
    const [userAvg, globalAgg, contextBreakdown] = await Promise.all([
      this.prisma.analysis.aggregate({
        where: { userId },
        _avg: { scoreGlobal: true, scoreTone: true, scoreConfidence: true, scoreReadability: true, scoreImpact: true },
        _count: { id: true },
      }),
      this.prisma.analysis.aggregate({
        _avg: { scoreGlobal: true, scoreTone: true, scoreConfidence: true, scoreReadability: true, scoreImpact: true },
        _count: { id: true },
      }),
      this.prisma.analysis.groupBy({
        by: ['context'],
        _avg: { scoreGlobal: true },
        _count: { id: true },
      }),
    ]);

    // calculate user percentile (fraction of users with lower average score)
    const allUserAvgs = await this.prisma.analysis.groupBy({
      by: ['userId'],
      _avg: { scoreGlobal: true },
    });

    const myAvg = userAvg._avg.scoreGlobal ?? 0;
    const below = allUserAvgs.filter((u) => (u._avg.scoreGlobal ?? 0) < myAvg).length;
    const percentile = allUserAvgs.length > 1
      ? Math.round((below / (allUserAvgs.length - 1)) * 100)
      : 100;

    return {
      me: {
        totalAnalyses: userAvg._count.id,
        avgGlobal: Math.round(myAvg),
        avgTone: Math.round(userAvg._avg.scoreTone ?? 0),
        avgConfidence: Math.round(userAvg._avg.scoreConfidence ?? 0),
        avgReadability: Math.round(userAvg._avg.scoreReadability ?? 0),
        avgImpact: Math.round(userAvg._avg.scoreImpact ?? 0),
      },
      global: {
        totalAnalyses: globalAgg._count.id,
        avgGlobal: Math.round(globalAgg._avg.scoreGlobal ?? 0),
        avgTone: Math.round(globalAgg._avg.scoreTone ?? 0),
        avgConfidence: Math.round(globalAgg._avg.scoreConfidence ?? 0),
        avgReadability: Math.round(globalAgg._avg.scoreReadability ?? 0),
        avgImpact: Math.round(globalAgg._avg.scoreImpact ?? 0),
      },
      percentile,
      contextBreakdown: contextBreakdown.map((c) => ({
        context: c.context,
        avgScore: Math.round(c._avg.scoreGlobal ?? 0),
        count: c._count.id,
      })),
    };
  }

  // ─── Goals ───────────────────────────────────────────────────────────────────

  async getGoals(userId: string) {
    return this.prisma.userGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async createGoal(userId: string, dto: { targetScore: number; category?: string; deadline?: string }) {
    return this.prisma.userGoal.create({
      data: {
        userId,
        targetScore: dto.targetScore,
        category: dto.category,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
    });
  }

  async updateGoal(userId: string, goalId: string, dto: { targetScore?: number; category?: string; deadline?: string; isCompleted?: boolean }) {
    const goal = await this.prisma.userGoal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal not found');
    return this.prisma.userGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.targetScore !== undefined && { targetScore: dto.targetScore }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.deadline !== undefined && { deadline: new Date(dto.deadline) }),
        ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
      },
    });
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await this.prisma.userGoal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal not found');
    return this.prisma.userGoal.delete({ where: { id: goalId } });
  }
}
