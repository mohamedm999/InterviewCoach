import { Test, TestingModule } from '@nestjs/testing';
import { AnalysesService } from '../analyses.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalysisEngineService } from '../analysis-engine.service';
import { LlmCoachingService } from '../llm-coaching.service';
import { AnalysesGateway } from '../analyses.gateway';
import { CreateAnalysisDto } from '../dto/create-analysis.dto';
import { Context, Role } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AnalysesService', () => {
  let service: AnalysesService;
  let prismaService: PrismaService;
  let analysisEngineService: any;

  const mockAnalysis = {
    id: 'analysis-id',
    userId: 'test-user-id',
    context: 'FORMAL' as Context,
    inputText: 'Test pitch text',
    inputTextHash: 'hash',
    versionIndex: 1,
    scoreGlobal: 75,
    scoreTone: 80,
    scoreConfidence: 70,
    scoreReadability: 85,
    scoreImpact: 65,
    modelMeta: {},
    recommendations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysesService,
        {
          provide: PrismaService,
          useValue: {
            analysis: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            recommendation: { createMany: jest.fn(), findMany: jest.fn() },
            analysisConfig: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AnalysisEngineService,
          useValue: {
            normalizeText: jest
              .fn()
              .mockImplementation((text: string) => text.trim()),
            computeReadabilityScore: jest.fn().mockReturnValue(85),
            computeToneScore: jest.fn().mockReturnValue(80),
            computeConfidenceScore: jest.fn().mockReturnValue(70),
            computeImpactScore: jest.fn().mockReturnValue(65),
            aggregateGlobalScore: jest.fn().mockReturnValue(75),
            generateRecommendations: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: LlmCoachingService,
          useValue: {
            generateCoaching: jest
              .fn()
              .mockResolvedValue('Mock AI coaching feedback.'),
          },
        },
        {
          provide: AnalysesGateway,
          useValue: {
            broadcastProgress: jest.fn(),
            broadcastComplete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalysesService>(AnalysesService);
    prismaService = module.get<PrismaService>(PrismaService);
    analysisEngineService = module.get(AnalysisEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── CREATE ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const userId = 'test-user-id';
    const dto: CreateAnalysisDto = {
      content: 'Test pitch text',
      context: 'FORMAL' as Context,
    };
    const mockRecommendations = [
      {
        id: 'rec-id',
        analysisId: 'analysis-id',
        category: 'CONFIDENCE',
        priority: 'MEDIUM',
        title: 'Improve',
        description: 'Desc',
        examples: [],
      },
    ];

    const mockConfig = {
      id: 'config-id',
      version: 1,
      isActive: true,
      weights: { tone: 25, confidence: 25, readability: 25, impact: 25 },
      thresholds: { high: 30, medium: 60 },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
    };

    const mockTransaction = ({
      existingAnalysis = null,
      createdAnalysis = mockAnalysis,
      createdRecommendations = mockRecommendations,
    }: {
      existingAnalysis?: any;
      createdAnalysis?: any;
      createdRecommendations?: any[];
    } = {}) => {
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) =>
          callback({
            analysisConfig: {
              findFirst: jest.fn().mockResolvedValue(mockConfig),
            },
            analysis: {
              findFirst: jest.fn().mockResolvedValue(existingAnalysis),
              create: jest.fn().mockResolvedValue(createdAnalysis),
            },
            recommendation: {
              createMany: jest
                .fn()
                .mockResolvedValue({ count: createdRecommendations.length }),
              findMany: jest.fn().mockResolvedValue(createdRecommendations),
            },
          }),
        );
    };

    it('should create analysis with correct versionIndex', async () => {
      mockTransaction({
        existingAnalysis: null,
        createdAnalysis: { ...mockAnalysis, versionIndex: 0 },
      });

      const result = await service.create(userId, dto);
      expect(result.versionIndex).toBe(0);
    });

    it('should increment versionIndex for subsequent analyses', async () => {
      mockTransaction({
        existingAnalysis: { versionIndex: 2 },
        createdAnalysis: { ...mockAnalysis, versionIndex: 3 },
      });

      const result = await service.create(userId, dto);
      expect(result.versionIndex).toBe(3);
    });

    it('should return scores between 0 and 100', async () => {
      mockTransaction();

      const result = await service.create(userId, dto);
      expect(result.scores.global).toBeGreaterThanOrEqual(0);
      expect(result.scores.global).toBeLessThanOrEqual(100);
    });

    it('should include recommendations in results', async () => {
      const mockRecs = [
        {
          category: 'CONFIDENCE',
          priority: 'MEDIUM',
          title: 'Improve',
          description: 'Desc',
          examples: [],
        },
      ];
      jest
        .spyOn(analysisEngineService, 'generateRecommendations')
        .mockReturnValue(mockRecs);
      mockTransaction({
        createdRecommendations: [
          { id: 'rec-id', analysisId: 'analysis-id', ...mockRecs[0] },
        ],
      });

      const result = await service.create(userId, dto);
      expect(result.recommendations).toHaveLength(1);
    });
  });

  // ─── FIND ONE ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return analysis for the owner', async () => {
      jest
        .spyOn(prismaService.analysis, 'findFirst')
        .mockResolvedValue(mockAnalysis as any);
      const result = await service.findOne(
        'analysis-id',
        'test-user-id',
        Role.USER,
      );
      expect(result.analysisId).toBe('analysis-id');
    });

    it('should allow ADMIN to access any analysis', async () => {
      jest
        .spyOn(prismaService.analysis, 'findFirst')
        .mockResolvedValue(mockAnalysis as any);
      const result = await service.findOne(
        'analysis-id',
        'admin-user-id',
        Role.ADMIN,
      );
      expect(result.analysisId).toBe('analysis-id');
    });

    it('should throw NotFoundException when analysis does not exist', async () => {
      jest.spyOn(prismaService.analysis, 'findFirst').mockResolvedValue(null);
      await expect(
        service.findOne('non-existent', 'test-user-id', Role.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner USER tries to access', async () => {
      jest
        .spyOn(prismaService.analysis, 'findFirst')
        .mockResolvedValue(mockAnalysis as any);
      await expect(
        service.findOne('analysis-id', 'other-user-id', Role.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── FIND ALL ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated list for a regular user', async () => {
      jest
        .spyOn(prismaService.analysis, 'findMany')
        .mockResolvedValue([mockAnalysis] as any);
      jest.spyOn(prismaService.analysis, 'count').mockResolvedValue(1);

      const result = await service.findAll('test-user-id', Role.USER, {
        page: 1,
        pageSize: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should allow ADMIN to see all analyses', async () => {
      const analysis2 = {
        ...mockAnalysis,
        id: 'analysis-id-2',
        userId: 'other-user',
      };
      jest
        .spyOn(prismaService.analysis, 'findMany')
        .mockResolvedValue([mockAnalysis, analysis2] as any);
      jest.spyOn(prismaService.analysis, 'count').mockResolvedValue(2);

      const result = await service.findAll('admin-user-id', Role.ADMIN, {
        page: 1,
        pageSize: 20,
      });
      expect(result.total).toBe(2);
    });

    it('should calculate skip correctly for page 3 with pageSize 10', async () => {
      jest.spyOn(prismaService.analysis, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.analysis, 'count').mockResolvedValue(50);

      const result = await service.findAll('test-user-id', Role.USER, {
        page: 3,
        pageSize: 10,
      });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(prismaService.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should return empty list when user has no analyses', async () => {
      jest.spyOn(prismaService.analysis, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.analysis, 'count').mockResolvedValue(0);

      const result = await service.findAll('test-user-id', Role.USER, {
        page: 1,
        pageSize: 20,
      });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
