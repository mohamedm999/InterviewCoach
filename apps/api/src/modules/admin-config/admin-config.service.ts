import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AnalysisConfig,
  UpdateConfigRequest,
} from '@interviewcoach/shared';

@Injectable()
export class AdminConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<AnalysisConfig> {
    const config = await this.prisma.analysisConfig.findFirst();
    if (!config) {
      // Return defaults if no config exists yet
      return {
        weights: { tone: 25, confidence: 25, readability: 25, impact: 25 },
        thresholds: { high: 30, medium: 60 },
      };
    }
    return {
      id: config.id,
      weights: config.weights as unknown as AnalysisConfig['weights'],
      thresholds: config.thresholds as unknown as AnalysisConfig['thresholds'],
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  async updateConfig(dto: UpdateConfigRequest) {
    // Validate: weights sum must equal 100
    const { tone, confidence, readability, impact } = dto.weights;
    const sum = tone + confidence + readability + impact;
    if (sum !== 100) {
      throw new BadRequestException(
        `Weights must sum to 100. Current sum: ${sum}`,
      );
    }

    // Validate: 0 < high < medium < 100
    const { high, medium } = dto.thresholds;
    if (high <= 0 || high >= medium || medium >= 100) {
      throw new BadRequestException(
        'Thresholds must satisfy: 0 < high < medium < 100',
      );
    }

    // Upsert: update first record or create if none exists
    const existing = await this.prisma.analysisConfig.findFirst();
    if (existing) {
      return this.prisma.analysisConfig.update({
        where: { id: existing.id },
        data: { weights: dto.weights, thresholds: dto.thresholds } as any,
      });
    }

    return this.prisma.analysisConfig.create({
      data: { weights: dto.weights, thresholds: dto.thresholds } as any,
    });
  }
}
