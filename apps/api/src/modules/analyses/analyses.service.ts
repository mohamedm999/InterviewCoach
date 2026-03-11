import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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
import { sanitizeInput } from '../../common/utils/sanitizer';

type AnalysisWithRecommendations = Analysis & {
  recommendations: Recommendation[];
};

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
    // Validate input length
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }

    // Use transaction to ensure data consistency
    return await this.prisma.$transaction(async (tx) => {
      // 1. Sanitize input to prevent XSS attacks
      const sanitizedContent = sanitizeInput(dto.content);

      // 2. Normalize text (remove extra spaces, control characters, etc.)
      const normalizedText = this.engine.normalizeText(sanitizedContent);

      // 3. Compute SHA-256 hash of normalized text
      const inputTextHash = createHash('sha256')
        .update(normalizedText)
        .digest('hex');

      // 4. Load AnalysisConfig weights/thresholds (use first config or defaults)
      const config = await tx.analysisConfig.findFirst();
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

      // 6. Compute weighted global score
      const weightsTyped = weights as unknown as AnalysisWeights;
      const global = Math.round(
        (tone * weightsTyped.tone +
          confidence * weightsTyped.confidence +
          readability * weightsTyped.readability +
          impact * weightsTyped.impact) /
          100,
      );

      // 7. Check for duplicate analysis (same user + same hash)
      const existingAnalysis = await tx.analysis.findFirst({
        where: { userId, inputTextHash, deletedAt: null },
        orderBy: { versionIndex: 'desc' },
      });

      const versionIndex = existingAnalysis ? existingAnalysis.versionIndex + 1 : 0;

      // 8. Create Analysis record
      const analysis = await tx.analysis.create({
        data: {
          userId,
          context: dto.context,
          inputText: normalizedText,
          inputTextHash,
          versionIndex,
          scoreGlobal: global,
          scoreTone: tone,
          scoreConfidence: confidence,
          scoreReadability: readability,
          scoreImpact: impact,
          modelMeta: {
            version: '1.0',
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 9. Generate recommendations
      const recommendations = this.engine.generateRecommendations(
        { tone, confidence, readability, impact },
        normalizedText,
        dto.context,
        thresholds as unknown as AnalysisThresholds,
      );

      // 10. Save recommendations
      await tx.recommendation.createMany({
        data: recommendations.map((r) => ({
          analysisId: analysis.id,
          category: r.category,
          priority: r.priority,
          title: r.title,
          description: r.description,
          examples: r.examples,
        })),
      });

      // 11. Fetch created recommendations
      const createdRecommendations = await tx.recommendation.findMany({
        where: { analysisId: analysis.id },
      });

      // 12. Generate AI coaching feedback (outside transaction for performance)
      let coachingFeedback: string | undefined;
      try {
        coachingFeedback = await this.llm.generateCoaching(
          normalizedText,
          dto.context,
          { tone, confidence, readability, impact, global },
        );
      } catch (error) {
        console.error('Failed to generate coaching feedback:', error);
        coachingFeedback = undefined;
      }

      // 13. Broadcast completion via WebSocket
      this.gateway.broadcastComplete(analysis.id);

      // 14. Return response
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
        recommendations: createdRecommendations.map((r) => ({
          id: r.id,
          category: r.category,
          priority: r.priority,
          title: r.title,
          description: r.description,
          examples: r.examples,
        })),
        coachingFeedback,
        createdAt: analysis.createdAt,
      };
    });
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<AnalysisResponseDto> {
    const analysis = await this.prisma.analysis.findFirst({
      where: { 
        id,
        deletedAt: null, // Exclude soft-deleted analyses
      },
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
      deletedAt: null, // Exclude soft-deleted analyses
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

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  async softDelete(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<void> {
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    // Check ownership
    if (
      analysis.userId !== requestingUserId &&
      requestingUserRole !== Role.ADMIN
    ) {
      throw new ForbiddenException('You do not have permission to delete this analysis');
    }

    await this.prisma.analysis.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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
