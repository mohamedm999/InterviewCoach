import { Injectable } from '@nestjs/common';
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
}
