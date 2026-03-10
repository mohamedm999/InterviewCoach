# Prompt 01 — Project Setup + Backend (NestJS)

---

## Prompt 1.1 — Monorepo Initialization

```
Create a monorepo for the InterviewCoach project with this structure:

interviewcoach/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared types, DTOs, constants, zod schemas
├── docker-compose.yml
├── .env.example
├── .github/workflows/ci.yml
├── .gitignore
├── README.md
└── package.json      # root workspace

Use npm workspaces. The root package.json should define:
  "workspaces": ["apps/*", "packages/*"]

Initialize apps/api with NestJS CLI (nest new api --skip-git --package-manager npm)
Initialize apps/web with Next.js (npx create-next-app@latest web --typescript --app --eslint --src-dir --import-alias "@/*" --no-tailwind)
Initialize packages/shared as a plain TypeScript package.

Create .env.example with:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interviewcoach
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
```

---

## Prompt 1.2 — Backend: NestJS Base Configuration

```
In apps/api, set up the NestJS application with:

1. Install dependencies:
   npm i @nestjs/config @nestjs/throttler helmet class-validator class-transformer
   npm i @prisma/client
   npm i -D prisma

2. main.ts configuration:
   - Global ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
   - Global prefix: 'api/v1'
   - helmet() middleware
   - CORS enabled for CORS_ORIGINS from env
   - Body size limit: 1MB
   - Listen on port 3001

3. app.module.ts:
   - ConfigModule.forRoot({ isGlobal: true })
   - ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])
   - Import all feature modules

4. Create src/common/ with:
   - filters/http-exception.filter.ts (global, returns { statusCode, message, error, requestId, timestamp })
   - interceptors/logging.interceptor.ts (logs method, url, duration)
   - decorators/roles.decorator.ts (@Roles('ADMIN','USER'))
   - guards/jwt-auth.guard.ts (extends AuthGuard('jwt'))
   - guards/roles.guard.ts (checks @Roles metadata vs request.user.role)
```

---

## Prompt 1.3 — Backend: Prisma Schema + Database

```
In apps/api, initialize Prisma and create the full schema:

npx prisma init

schema.prisma:

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  USER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

enum Context {
  FORMAL
  STARTUP
  TECHNICAL
  CREATIVE
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum RecommendationCategory {
  TONE
  CONFIDENCE
  READABILITY
  IMPACT
  STRUCTURE
  GENERAL
}

model User {
  id            String         @id @default(uuid()) @db.Uuid
  email         String         @unique
  passwordHash  String
  displayName   String?
  role          Role           @default(USER)
  status        UserStatus     @default(ACTIVE)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  lastLoginAt   DateTime?
  analyses      Analysis[]
  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  tokenHash String
  expiresAt DateTime
  isRevoked Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model Analysis {
  id              String           @id @default(uuid()) @db.Uuid
  userId          String           @db.Uuid
  context         Context
  inputText       String
  inputTextHash   String
  versionIndex    Int
  scoreGlobal     Int
  scoreTone       Int
  scoreConfidence Int
  scoreReadability Int
  scoreImpact     Int
  modelMeta       Json?
  createdAt       DateTime         @default(now())
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  recommendations Recommendation[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, versionIndex])
  @@map("analyses")
}

model Recommendation {
  id          String                 @id @default(uuid()) @db.Uuid
  analysisId  String                 @db.Uuid
  category    RecommendationCategory
  priority    Priority
  title       String
  description String
  examples    String[]
  createdAt   DateTime               @default(now())
  analysis    Analysis               @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@index([analysisId])
  @@map("recommendations")
}

model PitchTemplate {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  context   Context
  content   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("pitch_templates")
}

model AnalysisConfig {
  id         String   @id @default(uuid()) @db.Uuid
  weights    Json     @default("{\"tone\":25,\"confidence\":25,\"readability\":25,\"impact\":25}")
  thresholds Json     @default("{\"high\":30,\"medium\":60}")
  updatedAt  DateTime @updatedAt

  @@map("analysis_config")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  actorUserId String   @db.Uuid
  action      String
  entityType  String
  entityId    String?  @db.Uuid
  metadata    Json?
  createdAt   DateTime @default(now())
  actor       User     @relation(fields: [actorUserId], references: [id])

  @@index([actorUserId])
  @@index([createdAt])
  @@map("audit_logs")
}

Then run:
npx prisma migrate dev --name init
npx prisma generate

Create src/prisma/prisma.service.ts and prisma.module.ts (global module).
```

---

## Prompt 1.4 — Backend: Auth Module

```
Create the Auth module in apps/api/src/modules/auth/ with:

Files:
- auth.module.ts
- auth.controller.ts
- auth.service.ts
- strategies/jwt.strategy.ts
- strategies/jwt-refresh.strategy.ts
- dto/register.dto.ts
- dto/login.dto.ts
- dto/refresh-token.dto.ts
- dto/auth-response.dto.ts

DTOs:
RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) @Matches(/(?=.*[A-Z])(?=.*[0-9])/) password: string;
}

LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

RefreshTokenDto {
  @IsString() refreshToken: string;
}

AuthResponseDto {
  user: { id, email, role, displayName };
  accessToken: string;
  refreshToken: string;
}

Controller endpoints:
POST /auth/register  → register(dto: RegisterDto): AuthResponseDto
POST /auth/login     → login(dto: LoginDto): AuthResponseDto
POST /auth/refresh   → refresh(dto: RefreshTokenDto): AuthResponseDto
POST /auth/logout    → logout(@Req() req): { message }  [JWT protected]

Service logic:
- register: check unique email, hash password with argon2, create user, generate tokens
- login: find user by email, verify password, update lastLoginAt, generate tokens
- generateTokens: create accessToken (15m) + refreshToken (7d), hash refresh and store in DB
- refresh: find token by hash, check not revoked + not expired, rotate (revoke old, create new)
- logout: revoke all refresh tokens for user

JWT Strategy: extract from Bearer header, validate, attach user to request
Install: npm i @nestjs/jwt @nestjs/passport passport passport-jwt argon2
         npm i -D @types/passport-jwt
```

---

## Prompt 1.5 — Backend: Users Module

```
Create the Users module in apps/api/src/modules/users/:

Files:
- users.module.ts
- users.controller.ts
- users.service.ts
- dto/update-profile.dto.ts
- dto/user-response.dto.ts
- dto/admin-update-status.dto.ts
- dto/pagination-query.dto.ts

DTOs:
UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) displayName?: string;
}


AdminUpdateStatusDto {
  @IsEnum(UserStatus) status: 'ACTIVE' | 'SUSPENDED';
}

PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20;
  @IsOptional() @IsEnum(Role) role?: string;
  @IsOptional() @IsEnum(UserStatus) status?: string;
}

Endpoints:
GET    /users/me                  [JWT] → UserResponseDto
PATCH  /users/me                  [JWT] → UserResponseDto
GET    /admin/users               [JWT, ADMIN] → { data: UserResponseDto[], total, page, pageSize }
PATCH  /admin/users/:id/status    [JWT, ADMIN] → UserResponseDto
```

---

## Prompt 1.6 — Backend: Analysis Module + AI Service

```
Create the Analyses module in apps/api/src/modules/analyses/:

Files:
- analyses.module.ts
- analyses.controller.ts
- analyses.service.ts
- analysis-engine.service.ts  (scoring logic)
- dto/create-analysis.dto.ts
- dto/analysis-query.dto.ts
- dto/analysis-response.dto.ts

CreateAnalysisDto {
  @IsEnum(Context) context: 'FORMAL' | 'STARTUP' | 'TECHNICAL' | 'CREATIVE';
  @IsString() @MinLength(50) @MaxLength(5000) inputText: string;
}

AnalysisQueryDto {
  @IsOptional() page, pageSize (same pattern as pagination)
  @IsOptional() @IsEnum(Context) context?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

Endpoints:
POST /analyses         [JWT] → { analysisId, scores, recommendations }
GET  /analyses/:id     [JWT, owner or ADMIN]
GET  /analyses         [JWT, user=own, admin=filter by userId]

AnalysisEngineService — scoring functions:

normalizeText(input): trim, collapse whitespace, remove control chars

computeReadabilityScore(text): 0-100
  - Average sentence length (penalize >25 words)
  - Paragraph count (reward structure)
  - Word repetition ratio (penalize >15%)
  - Vocabulary diversity

computeToneScore(text, context): 0-100
  - Count weak words ("peut-être","je pense","un peu") → penalize
  - Count assertive words ("j'ai réalisé","j'ai dirigé") → reward
  - Context matching: formal=polite, startup=dynamic, technical=precise, creative=original

computeConfidenceScore(text): 0-100
  - Detect hesitations ("euh","hmm","en fait")
  - Passive voice ratio → penalize
  - Hedging/attenuators count → penalize
  - First-person active statements → reward

computeImpactScore(text): 0-100
  - Metrics/numbers presence → reward
  - Action verbs count → reward
  - Concrete results mentioned → reward
  - Specific achievements vs vague claims

aggregateGlobalScore(scores, weights): weighted average, clamped 0-100

generateRecommendations(scores, text, context, thresholds):
  For each category below threshold:
    priority = score < thresholds.high ? HIGH : score < thresholds.medium ? MEDIUM : LOW
    Generate title + actionable description + example
  Sort by priority: HIGH → MEDIUM → LOW

Workflow in service:
1. Validate + normalize text
2. Compute hash (sha256 of normalized text)
3. Get versionIndex = max existing for user + 1
4. Load AnalysisConfig weights/thresholds
5. Compute all scores
6. Generate recommendations
7. Prisma transaction: create Analysis + Recommendations
8. Return result
```

---

## Prompt 1.7 — Backend: Recommendations, Statistics, PDF, Admin Config

```
=== Recommendations Module ===
apps/api/src/modules/recommendations/

GET /analyses/:id/recommendations [JWT, owner/admin]
  Returns recommendations sorted by priority (HIGH→MEDIUM→LOW)

=== Statistics Module ===
apps/api/src/modules/statistics/

GET /stats/me/progression [JWT]
  Returns: { data: [{ date, scoreGlobal, scoreTone, scoreConfidence, scoreReadability, scoreImpact }] }
  Query analyses ordered by createdAt, return time series

GET /admin/stats/overview [JWT, ADMIN]
  Returns: { totalAnalyses, averageScore, improvementRate, totalUsers, activeUsers }
  improvementRate = avg of (lastScore - firstScore) per user

GET /admin/stats/by-context [JWT, ADMIN]
  Returns: { FORMAL: { count, avgScore }, STARTUP: {...}, TECHNICAL: {...}, CREATIVE: {...} }

=== PDF Export Module ===
apps/api/src/modules/pdf-export/

POST /analyses/:id/pdf [JWT, owner/admin]
  - Load analysis + recommendations
  - Generate PDF with pdfmake or @react-pdf/renderer:
    Header: InterviewCoach Report
    Info: date, context, version
    Scores: global (big), then category breakdown (bar chart or table)
    Recommendations: grouped by priority, each with title + description + examples
  - Return PDF as stream (Content-Type: application/pdf)
  - SECURITY: escape all user text, never inject raw HTML

Install: npm i pdfmake @types/pdfmake

=== Admin Config Module ===
apps/api/src/modules/admin-config/

GET /admin/config [JWT, ADMIN]
PUT /admin/config [JWT, ADMIN]
  Body: { weights: { tone, confidence, readability, impact }, thresholds: { high, medium } }
  Validate: weights sum must equal 100, thresholds: 0 < high < medium < 100

Create seed script (prisma/seed.ts):
  - Create default AnalysisConfig
  - Create admin user (admin@interviewcoach.com / Admin123!)
  - Create sample PitchTemplates (one per context)
```

---

## Prompt 1.8 — Backend: Tests

```
Create tests in apps/api:

=== Unit Tests ===
src/modules/analyses/__tests__/analysis-engine.service.spec.ts
  - normalizeText: trims, collapses whitespace
  - computeReadabilityScore: returns 0-100, penalizes long sentences
  - computeToneScore: rewards assertive language
  - computeConfidenceScore: penalizes hesitations
  - computeImpactScore: rewards metrics and action verbs
  - aggregateGlobalScore: weighted average, clamped 0-100
  - generateRecommendations: HIGH for scores < high threshold

src/modules/analyses/__tests__/analyses.service.spec.ts
  - creates analysis with correct versionIndex
  - score is always between 0 and 100
  - recommendations are created in transaction

src/modules/auth/__tests__/auth.service.spec.ts
  - register: hashes password, creates user, returns tokens
  - login: validates password, returns tokens
  - refresh: rotates token, revokes old
  - rejects duplicate email on register
  - rejects invalid password on login

=== E2E Tests ===
test/app.e2e-spec.ts
  Full flow:
  1. POST /auth/register → 201
  2. POST /auth/login → 200 + tokens
  3. POST /analyses → 201 + scores
  4. GET /analyses → list with 1 item
  5. GET /analyses/:id → full result
  6. GET /analyses/:id/recommendations → sorted
  7. POST /analyses (same text modified) → versionIndex = 2
  8. GET /stats/me/progression → 2 data points
  9. POST /analyses/:id/pdf → PDF buffer
  10. POST /auth/logout → 200

Use: @nestjs/testing, supertest
Configure: jest config in package.json with moduleNameMapper for paths
```
