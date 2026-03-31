import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MAX_PITCH_LENGTH,
  MIN_PITCH_LENGTH,
} from '@interviewcoach/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { AnalysisQueryDto } from './dto/analysis-query.dto';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { LlmCoachingService } from './llm-coaching.service';
import { AnalysesGateway } from './analyses.gateway';
import { Role } from '@prisma/client';
import { createHash } from 'crypto';
import { sanitizeInput } from '../../common/utils/sanitizer';
import { activeAnalysisWhere } from './analysis.where';
import { LlmProviderUnavailableError } from './llm-provider.error';

interface LlmAnalysisResult {
  scores: {
    global: number;
    tone: number;
    confidence: number;
    readability: number;
    impact: number;
  };
  recommendations: Array<{
    category: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    examples: string[];
  }>;
  coachingFeedback: string;
}

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
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
    if (dto.content.length < MIN_PITCH_LENGTH) {
      throw new BadRequestException(
        `Content must be at least ${MIN_PITCH_LENGTH} characters`,
      );
    }
    if (dto.content.length > MAX_PITCH_LENGTH) {
      throw new BadRequestException(
        `Content must be at most ${MAX_PITCH_LENGTH} characters`,
      );
    }

    // Use transaction to ensure data consistency
    return await this.prisma.$transaction(async (tx) => {
      // 1. Sanitize input to prevent XSS attacks
      const sanitizedContent = sanitizeInput(dto.content);

      // 2. Normalize text
      const normalizedText = sanitizedContent.trim();

      // 3. Compute SHA-256 hash of normalized text
      const inputTextHash = createHash('sha256')
        .update(normalizedText)
        .digest('hex');

      // 4. Check for duplicate analysis (same user + same hash)
      const existingAnalysis = await tx.analysis.findFirst({
        where: activeAnalysisWhere({ userId, inputTextHash }),
        orderBy: { versionIndex: 'desc' },
      });

      const versionIndex = existingAnalysis
        ? existingAnalysis.versionIndex + 1
        : 0;

      // 5. Call LLM for COMPLETE analysis (scores + recommendations + feedback)
      let llmResult: LlmAnalysisResult;
      try {
        llmResult = await this.llm.analyzePitch(
          normalizedText,
          dto.context,
        );
      } catch (error) {
        this.logger.error(`LLM analysis failed: ${error?.message}`);
        throw new ServiceUnavailableException({
          code: 'SYS_001',
          message: 'AI analysis service unavailable. Please try again.',
        });
      }

      // 6. Validate LLM scores are within range
      this.validateScores(llmResult.scores);

      // 7. Create Analysis record with LLM scores
      const analysis = await tx.analysis.create({
        data: {
          userId,
          context: dto.context,
          inputText: normalizedText,
          inputTextHash,
          versionIndex,
          scoreGlobal: llmResult.scores.global,
          scoreTone: llmResult.scores.tone,
          scoreConfidence: llmResult.scores.confidence,
          scoreReadability: llmResult.scores.readability,
          scoreImpact: llmResult.scores.impact,
          modelMeta: {
            version: '2.0',
            timestamp: new Date().toISOString(),
            provider: 'openrouter',
            model: 'openai/gpt-4o-mini',
            coachingFeedback: llmResult.coachingFeedback, // ✅ Save coaching feedback!
          },
        },
      });

      // 8. Save recommendations from LLM
      await tx.recommendation.createMany({
        data: llmResult.recommendations.map((r) => ({
          analysisId: analysis.id,
          category: r.category as any,
          priority: r.priority,
          title: r.title,
          description: r.description,
          examples: r.examples,
        })),
      });

      // 9. Fetch created recommendations
      const createdRecommendations = await tx.recommendation.findMany({
        where: { analysisId: analysis.id },
      });

      // 10. Broadcast completion via WebSocket
      this.gateway.broadcastComplete(analysis.id);

      // 11. Return response
      return {
        analysisId: analysis.id,
        userId: analysis.userId,
        context: analysis.context,
        inputText: analysis.inputText,
        versionIndex: analysis.versionIndex,
        scores: llmResult.scores,
        recommendations: createdRecommendations.map((r) => ({
          id: r.id,
          category: r.category,
          priority: r.priority,
          title: r.title,
          description: r.description,
          examples: r.examples,
        })),
        coachingFeedback: llmResult.coachingFeedback,
        createdAt: analysis.createdAt,
      };
    });
  }

  // ─── Validate Scores ──────────────────────────────────────────────────────

  private validateScores(scores: {
    global: number;
    tone: number;
    confidence: number;
    readability: number;
    impact: number;
  }): void {
    const allScores = [
      scores.global,
      scores.tone,
      scores.confidence,
      scores.readability,
      scores.impact,
    ];

    for (const score of allScores) {
      if (score < 0 || score > 100) {
        throw new BadRequestException(
          `Invalid score value: ${score}. All scores must be between 0 and 100.`,
        );
      }
    }
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<AnalysisResponseDto> {
    const analysis = await this.prisma.analysis.findFirst({
      where: activeAnalysisWhere({ id }),
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

    const where = activeAnalysisWhere({
      ...(requestingUserRole !== Role.ADMIN
        ? { userId: requestingUserId }
        : query.userId
          ? { userId: query.userId }
          : {}),
      ...(query.context ? { context: query.context } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    });

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
      where: activeAnalysisWhere({ id }),
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    // Check ownership
    if (
      analysis.userId !== requestingUserId &&
      requestingUserRole !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this analysis',
      );
    }

    await this.prisma.analysis.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private toDto(analysis: any): AnalysisResponseDto {
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
      recommendations: analysis.recommendations.map((r: any) => ({
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
