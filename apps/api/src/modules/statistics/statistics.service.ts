import { Injectable } from '@nestjs/common';
import { Context } from '@prisma/client';
import type {
  AdminOverviewData,
  ByContextEntry,
  PeerStats,
  UserProgressionResponse,
} from '@interviewcoach/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { activeAnalysisWhere } from '../analyses/analysis.where';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProgression(userId: string): Promise<UserProgressionResponse> {
    const analyses = await this.prisma.analysis.findMany({
      where: activeAnalysisWhere({ userId }),
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
      data: analyses.map((analysis) => ({
        date: analysis.createdAt.toISOString(),
        scoreGlobal: analysis.scoreGlobal,
        scoreTone: analysis.scoreTone,
        scoreConfidence: analysis.scoreConfidence,
        scoreReadability: analysis.scoreReadability,
        scoreImpact: analysis.scoreImpact,
      })),
    };
  }

  async getAdminOverview(): Promise<AdminOverviewData> {
    const [totalAnalyses, totalUsers, activeUsers, allUserScores] =
      await Promise.all([
        this.prisma.analysis.count({ where: activeAnalysisWhere() }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.$queryRaw<
          { userId: string; firstScore: number; lastScore: number }[]
        >`
        SELECT
          "userId",
          FIRST_VALUE("scoreGlobal") OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC) AS "firstScore",
          FIRST_VALUE("scoreGlobal") OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) AS "lastScore"
        FROM analyses
        WHERE "deletedAt" IS NULL
        GROUP BY "userId", "scoreGlobal", "createdAt"
      `,
      ]);

    const avgResult = await this.prisma.analysis.aggregate({
      where: activeAnalysisWhere(),
      _avg: { scoreGlobal: true },
    });
    const averageScore = Math.round(avgResult._avg.scoreGlobal ?? 0);

    const userAnalysisCounts = await this.prisma.analysis.groupBy({
      by: ['userId'],
      where: activeAnalysisWhere(),
      _count: { id: true },
    });
    const countMap = new Map<string, number>();
    for (const row of userAnalysisCounts) {
      countMap.set(row.userId, row._count.id);
    }

    const userMap = new Map<string, { first: number; last: number }>();
    for (const row of allUserScores) {
      if (!userMap.has(row.userId)) {
        userMap.set(row.userId, {
          first: row.firstScore,
          last: row.lastScore,
        });
      }
    }

    const improvements = [...userMap.entries()].map(([userId, scores]) => {
      const analysisCount = countMap.get(userId) || 1;
      return (scores.last - scores.first) / Math.max(1, analysisCount - 1);
    });
    const improvementRate =
      improvements.length > 0
        ? Math.round(
            improvements.reduce((total, value) => total + value, 0) /
              improvements.length,
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

  async getStatsByContext(): Promise<Record<string, ByContextEntry>> {
    const contexts = Object.values(Context);
    const result: Record<string, ByContextEntry> = {};

    for (const context of contexts) {
      const aggregate = await this.prisma.analysis.aggregate({
        where: activeAnalysisWhere({ context }),
        _count: { id: true },
        _avg: { scoreGlobal: true },
      });

      result[context] = {
        count: aggregate._count.id,
        avgScore: Math.round(aggregate._avg.scoreGlobal ?? 0),
      };
    }

    return result;
  }

  async exportUserAnalysesCsv(userId: string): Promise<string> {
    const analyses = await this.prisma.analysis.findMany({
      where: activeAnalysisWhere({ userId }),
      orderBy: { createdAt: 'desc' },
      include: { recommendations: true },
    });

    const header = [
      'Date',
      'Context',
      'Version',
      'Global Score',
      'Tone',
      'Confidence',
      'Readability',
      'Impact',
      'Recommendations Count',
      'Input Text (truncated)',
    ].join(',');

    const rows = analyses.map((analysis) =>
      [
        new Date(analysis.createdAt).toISOString(),
        analysis.context,
        analysis.versionIndex,
        analysis.scoreGlobal,
        analysis.scoreTone,
        analysis.scoreConfidence,
        analysis.scoreReadability,
        analysis.scoreImpact,
        analysis.recommendations.length,
        `"${(analysis.inputText || '').slice(0, 100).replace(/"/g, "'")}"`,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async getPeerStatistics(userId: string): Promise<PeerStats> {
    const [userAvg, platformAgg, myContextBreakdown, platformContextBreakdown] =
      await Promise.all([
      this.prisma.analysis.aggregate({
        where: activeAnalysisWhere({ userId }),
        _avg: {
          scoreGlobal: true,
          scoreTone: true,
          scoreConfidence: true,
          scoreReadability: true,
          scoreImpact: true,
        },
        _count: { id: true },
      }),
      this.prisma.analysis.aggregate({
        where: activeAnalysisWhere(),
        _avg: {
          scoreGlobal: true,
          scoreTone: true,
          scoreConfidence: true,
          scoreReadability: true,
          scoreImpact: true,
        },
        _count: { id: true },
      }),
      this.prisma.analysis.groupBy({
        by: ['context'],
        where: activeAnalysisWhere({ userId }),
        _avg: { scoreGlobal: true },
        _count: { id: true },
      }),
      this.prisma.analysis.groupBy({
        by: ['context'],
        where: activeAnalysisWhere(),
        _avg: { scoreGlobal: true },
        _count: { id: true },
      }),
    ]);

    const allUserAverages = await this.prisma.analysis.groupBy({
      by: ['userId'],
      where: activeAnalysisWhere(),
      _avg: { scoreGlobal: true },
    });

    const myAverage = userAvg._avg.scoreGlobal ?? 0;
    const belowCount = allUserAverages.filter(
      (row) => (row._avg.scoreGlobal ?? 0) < myAverage,
    ).length;
    const percentile =
      allUserAverages.length > 1
        ? Math.round((belowCount / (allUserAverages.length - 1)) * 100)
        : 100;

    return {
      me: {
        totalAnalyses: userAvg._count.id,
        avgGlobal: Math.round(myAverage),
        avgTone: Math.round(userAvg._avg.scoreTone ?? 0),
        avgConfidence: Math.round(userAvg._avg.scoreConfidence ?? 0),
        avgReadability: Math.round(userAvg._avg.scoreReadability ?? 0),
        avgImpact: Math.round(userAvg._avg.scoreImpact ?? 0),
      },
      platform: {
        totalAnalyses: platformAgg._count.id,
        avgGlobal: Math.round(platformAgg._avg.scoreGlobal ?? 0),
        avgTone: Math.round(platformAgg._avg.scoreTone ?? 0),
        avgConfidence: Math.round(platformAgg._avg.scoreConfidence ?? 0),
        avgReadability: Math.round(platformAgg._avg.scoreReadability ?? 0),
        avgImpact: Math.round(platformAgg._avg.scoreImpact ?? 0),
      },
      percentile,
      myContextBreakdown: myContextBreakdown.map((row) => ({
        context: row.context,
        avgScore: Math.round(row._avg.scoreGlobal ?? 0),
        count: row._count.id,
      })),
      platformContextBreakdown: platformContextBreakdown.map((row) => ({
        context: row.context,
        avgScore: Math.round(row._avg.scoreGlobal ?? 0),
        count: row._count.id,
      })),
    };
  }
}
