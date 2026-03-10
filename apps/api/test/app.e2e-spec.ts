import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// Mock PDF service to avoid PDFMake issues in tests
jest.mock('./../src/modules/pdf-export/pdf-export.service', () => {
  return {
    PdfExportService: jest.fn().mockImplementation(() => ({
      generateAnalysisPdf: jest.fn().mockResolvedValue({
        pipe: jest.fn(),
        on: jest.fn(),
        end: jest.fn(),
      }),
    })),
  };
});

describe('Full Flow E2E Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    // Clean up created data after each test
    if (prisma) {
      await prisma.recommendation.deleteMany({});
      await prisma.analysis.deleteMany({});
      await prisma.user.deleteMany({
        where: { email: { contains: 'test-' } },
      });
      await prisma.refreshToken.deleteMany({});
    }
  });

  it('Full flow test', async () => {
    // 1. POST /auth/register → 201
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    const { accessToken, refreshToken, user } = registerResponse.body;
    expect(user).toBeDefined();
    expect(user.displayName).toBe('Test User');
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // 2. POST /auth/login → 200 + tokens
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: 'TestPassword123!',
      })
      .expect(200);

    const {
      accessToken: loginAccessToken,
      refreshToken: loginRefreshToken,
      user: loginUser,
    } = loginResponse.body;
    expect(loginUser).toBeDefined();
    expect(loginAccessToken).toBeDefined();
    expect(loginRefreshToken).toBeDefined();

    const token = loginAccessToken;

    // 3. POST /analyses → 201 + scores
    const analysisResponse = await request(app.getHttpServer())
      .post('/analyses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content:
          'I am excited to join your team. My experience in software development and leadership has prepared me for this opportunity.',
        context: 'FORMAL',
      })
      .expect(201);

    const analysis1 = analysisResponse.body;
    expect(analysis1).toBeDefined();
    expect(analysis1.analysisId).toBeDefined();
    expect(analysis1.scores).toBeDefined();
    expect(analysis1.scores.global).toBeGreaterThanOrEqual(0);
    expect(analysis1.scores.global).toBeLessThanOrEqual(100);
    expect(analysis1.scores.tone).toBeGreaterThanOrEqual(0);
    expect(analysis1.scores.tone).toBeLessThanOrEqual(100);
    expect(analysis1.scores.confidence).toBeGreaterThanOrEqual(0);
    expect(analysis1.scores.confidence).toBeLessThanOrEqual(100);
    expect(analysis1.scores.readability).toBeGreaterThanOrEqual(0);
    expect(analysis1.scores.readability).toBeLessThanOrEqual(100);
    expect(analysis1.scores.impact).toBeGreaterThanOrEqual(0);
    expect(analysis1.scores.impact).toBeLessThanOrEqual(100);
    expect(analysis1.versionIndex).toBe(1);

    // 4. GET /analyses → paginated response with 1 item
    const analysesListResponse = await request(app.getHttpServer())
      .get('/analyses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const analysesList = analysesListResponse.body;
    expect(analysesList.data).toHaveLength(1);
    expect(analysesList.data[0].analysisId).toBe(analysis1.analysisId);

    // 5. GET /analyses/:id → full result
    const analysisDetailResponse = await request(app.getHttpServer())
      .get(`/analyses/${analysis1.analysisId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const analysisDetail = analysisDetailResponse.body;
    expect(analysisDetail).toBeDefined();
    expect(analysisDetail.analysisId).toBe(analysis1.analysisId);
    expect(analysisDetail.inputText).toBeDefined();
    expect(analysisDetail.scores.global).toBe(analysis1.scores.global);

    // 6. GET /analyses/:id/recommendations → sorted
    const recommendationsResponse = await request(app.getHttpServer())
      .get(`/analyses/${analysis1.analysisId}/recommendations`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const recommendations = recommendationsResponse.body;
    expect(Array.isArray(recommendations)).toBeTruthy();

    // Check if recommendations are sorted by priority (HIGH → MEDIUM → LOW)
    if (recommendations.length > 1) {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      for (let i = 0; i < recommendations.length - 1; i++) {
        const currentPriority = recommendations[i].priority;
        const nextPriority = recommendations[i + 1].priority;
        expect(priorityOrder[currentPriority]).toBeLessThanOrEqual(
          priorityOrder[nextPriority],
        );
      }
    }

    // 7. POST /analyses (same text modified) → versionIndex = 2
    const modifiedText =
      analysis1.inputText + ' Additionally, I bring strong analytical skills.';
    const analysisV2Response = await request(app.getHttpServer())
      .post('/analyses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: modifiedText,
        context: 'FORMAL',
      })
      .expect(201);

    const analysisV2 = analysisV2Response.body;
    expect(analysisV2.versionIndex).toBe(2);

    // 8. GET /statistics/me/progression → 2 data points
    const statsResponse = await request(app.getHttpServer())
      .get('/statistics/me/progression')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const statsData = statsResponse.body;
    expect(statsData.totalAnalyses).toBe(2);
    expect(statsData.progressionData).toBeDefined();
    expect(Array.isArray(statsData.progressionData)).toBeTruthy();

    // 9. POST /analyses/:id/pdf → PDF buffer
    const pdfResponse = await request(app.getHttpServer())
      .post(`/analyses/${analysis1.analysisId}/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .responseType('blob') // Expect binary response
      .expect(200);

    // Check that response is a PDF (starts with PDF signature)
    const pdfBuffer = pdfResponse.body;
    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBeTruthy();

    // 10. POST /auth/logout → 200
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: loginRefreshToken })
      .expect(200);
  });
});
