import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { AnalysisQueryDto } from './dto/analysis-query.dto';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { AnalysisEngineService } from './analysis-engine.service';
import { LlmCoachingService } from './llm-coaching.service';
import { AnalysesGateway } from './analyses.gateway';
import { Role, Analysis, Recommendation } from '@prisma/client';
import { createHash } from 'crypto';

type AnalysisWithRecommendations = Analysis & { recommendations: Recommendation[] };

interface AnalysisWeights {
  tone: number;
  confidence: number;
  readability: number;
  impact: number;
}

interface AnalysisThresholds {
  high: number;
  medium: number;
}

@Injectable()
export class AnalysesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AnalysisEngineService,
    private readonly llm: LlmCoachingService,
    private readonly gateway: AnalysesGateway,
  ) {}

  // ─── Create Analysis ──────────────────────────────────────────────────────

  async create(
    userId: string,
    dto: CreateAnalysisDto,
  ): Promise<AnalysisResponseDto> {
    // 1. Normalize text
    const normalizedText = this.engine.normalizeText(dto.content);

    // 2. Compute SHA-256 hash of normalized text
    const inputTextHash = createHash('sha256')
      .update(normalizedText)
      .digest('hex');

    // 3. Load AnalysisConfig weights/thresholds (use first config or defaults)
    const config = await this.prisma.analysisConfig.findFirst();
    const weights = config?.weights ?? {
      tone: 25,
      confidence: 25,
      readability: 25,
      impact: 25,
    };
    const thresholds = config?.thresholds ?? { high: 30, medium: 60 };

    // 5. Compute all scores
    const tone = this.engine.computeToneScore(normalizedText, dto.context);
    const confidence = this.engine.computeConfidenceScore(normalizedText);
    const readability = this.engine.computeReadabilityScore(normalizedText);
    const impact = this.engine.computeImpactScore(normalizedText);

    // 6. Compute global
    const global = this.engine.aggregateGlobalScore(
      { tone, confidence, readability, impact },
      weights as unknown as AnalysisWeights,
    );

    // Broadcast halfway progress
    this.gateway.broadcastProgress(userId, 50, 'Scores calculated. Generating feedback...');

    // 7. Generate recommendations
    const recommendations = this.engine.generateRecommendations(
      { tone, confidence, readability, impact },
      normalizedText,
      dto.context,
      thresholds as unknown as AnalysisThresholds,
    );

    // Broadcast AI generation step
    this.gateway.broadcastProgress(userId, 75, 'Analyzing with AI Coaching Engine...');

    // 8. Generate LLM Coaching
    const coachingFeedback = await this.llm.generateCoaching(
      normalizedText,
      dto.context,
      { global, tone, confidence, readability, impact }
    );

    // Broadcast final persistence step
    this.gateway.broadcastProgress(userId, 90, 'Saving analysis results...');

    // 8. Persist in explicit transaction (atomicity for versionIndex + create)
    const analysis = await this.prisma.$transaction(async (tx) => {
      // Re-check versionIndex inside transaction to avoid race conditions
      const latestAnalysis = await tx.analysis.findFirst({
        where: { userId },
        orderBy: { versionIndex: 'desc' },
      });
      const safeVersionIndex = (latestAnalysis?.versionIndex ?? 0) + 1;

      return tx.analysis.create({
        data: {
          userId,
          context: dto.context,
          inputText: dto.content,
          inputTextHash,
          versionIndex: safeVersionIndex,
          scoreGlobal: global,
          scoreTone: tone,
          scoreConfidence: confidence,
          scoreReadability: readability,
          scoreImpact: impact,
          modelMeta: { weights, thresholds, coachingFeedback },
          recommendations: {
            create: recommendations.map((r) => ({
              category: r.category,
              priority: r.priority,
              title: r.title,
              description: r.description,
              examples: r.examples,
            })),
          },
        },
        include: {
          recommendations: true,
        },
      });
    });

    this.gateway.broadcastProgress(userId, 100, 'Complete');
    this.gateway.broadcastComplete(analysis.id);

    return this.toDto(analysis);
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<AnalysisResponseDto> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { recommendations: true },
    });
    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    // Owner or ADMIN can access
    if (
      analysis.userId !== requestingUserId &&
      requestingUserRole !== Role.ADMIN
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.toDto(analysis);
  }

  // ─── Get List ─────────────────────────────────────────────────────────────

  async findAll(
    requestingUserId: string,
    requestingUserRole: Role,
    query: AnalysisQueryDto,
  ): Promise<{
    data: AnalysisResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);

    const where = {
      ...(requestingUserRole !== Role.ADMIN
        ? { userId: requestingUserId }
        : query.userId
          ? { userId: query.userId }
          : {}),
      ...(query.context ? { context: query.context } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };

    const [analyses, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        skip,
        take: pageSize,
        include: { recommendations: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    return {
      data: analyses.map((a) => this.toDto(a)),
      total,
      page,
      pageSize,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private toDto(analysis: AnalysisWithRecommendations): AnalysisResponseDto {
    const meta = (analysis.modelMeta as Record<string, any>) || {};
    return {
      analysisId: analysis.id,
      userId: analysis.userId,
      context: analysis.context,
      inputText: analysis.inputText,
      versionIndex: analysis.versionIndex,
      scores: {
        global: analysis.scoreGlobal,
        tone: analysis.scoreTone,
        confidence: analysis.scoreConfidence,
        readability: analysis.scoreReadability,
        impact: analysis.scoreImpact,
      },
      recommendations: analysis.recommendations.map((r: Recommendation) => ({
        id: r.id,
        category: r.category,
        priority: r.priority,
        title: r.title,
        description: r.description,
        examples: r.examples,
      })),
      coachingFeedback: meta.coachingFeedback,
      createdAt: analysis.createdAt,
    };
  }
}
