# InterviewCoach Project Architecture

## Purpose

InterviewCoach is an AI-powered interview preparation platform with:

- authentication and account management
- text-based pitch analysis
- score breakdowns and recommendations
- progress tracking and statistics
- admin management pages
- reusable UI primitives for fast page building

This document is intended to be a practical reference for:

- understanding the current project structure
- designing new pages consistently
- understanding how frontend pages map to backend modules
- understanding the database model and entity relations

## Repository Structure

The root project is organized as a monorepo with applications and shared packages.

```text
InterviewCoach/
  apps/
    api/        NestJS backend + Prisma + PostgreSQL
    web/        Next.js frontend
  packages/
    shared/     shared DTOs, validation schemas, and common types
  docs/         project documentation
  scripts/      setup and helper scripts
  tests/        integration and cross-app test tooling
```

## High-Level Architecture

### Frontend

The frontend lives in `apps/web` and uses:

- Next.js App Router
- React client components
- a reusable custom UI layer in `src/components/ui`
- route groups for feature separation
- axios-based API access through `src/lib/api.ts`

Main route groups:

- public pages: `src/app/page.tsx`, `about`, `privacy`, `terms`
- auth pages: `src/app/(auth)/auth/...`
- user pages: `src/app/(dashboard)/...`
- admin pages: `src/app/(admin)/admin/...`

### Backend

The backend lives in `apps/api` and uses:

- NestJS modules and controllers
- Prisma ORM
- PostgreSQL
- JWT authentication with refresh tokens
- role-based access control
- audit logging

Backend API base path:

```text
/api/v1
```

### Shared Package

`packages/shared` contains cross-app types and schemas used by both API and web layers. This reduces drift between request and response contracts.

## Frontend Page Structure

### Public Pages

These pages do not require login:

- `/`
- `/about`
- `/privacy`
- `/terms`

### Auth Pages

Located in `apps/web/src/app/(auth)/auth/`

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/verify`

Supporting frontend code:

- auth provider: `apps/web/src/context/auth-context.tsx`
- route protection: `apps/web/src/components/auth/ProtectedRoute.tsx`
- login form: `apps/web/src/components/forms/LoginForm.tsx`
- register form: `apps/web/src/components/forms/RegisterForm.tsx`

### User Pages

Located in `apps/web/src/app/(dashboard)/`

- `/dashboard`
- `/analysis/new`
- `/analysis/[id]`
- `/history`
- `/statistics`
- `/profile`

Main responsibilities:

- dashboard: summary, goals, recent analyses
- history: paginated analysis list
- statistics: progression, peer comparison, exports
- profile: account management
- analysis pages: create and view analyses

### Admin Pages

Located in `apps/web/src/app/(admin)/admin/`

- `/admin`
- `/admin/config`
- `/admin/templates`
- `/admin/audit-logs`

Admin shell:

- `apps/web/src/app/(admin)/layout.tsx`

Admin purpose:

- overview of platform activity
- user moderation
- scoring configuration
- pitch template management
- audit trail visibility

## Backend Module Structure

### Auth Module

Path:

`apps/api/src/modules/auth`

Main responsibilities:

- register
- login
- refresh token rotation
- logout
- email verification
- password reset
- JWT strategy handling

Main endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `POST /auth/verify-email`

### Users Module

Path:

`apps/api/src/modules/users`

Main responsibilities:

- current user profile
- profile updates
- password changes
- admin user listing
- admin status changes

Main endpoints:

- `GET /users/me`
- `PATCH /users/me`
- `POST /users/change-password`
- `GET /admin/users`
- `PATCH /admin/users/:id/status`

### Analyses Module

Path:

`apps/api/src/modules/analyses`

Main responsibilities:

- create analysis
- score pitch text
- generate recommendations
- fetch paginated analysis history
- fetch single analysis detail
- soft-delete support

Main endpoints:

- `POST /analyses`
- `GET /analyses`
- `GET /analyses/:id`

### Statistics Module

Path:

`apps/api/src/modules/statistics`

Main responsibilities:

- user progression statistics
- peer comparison
- CSV export
- admin overview statistics
- admin context breakdown

Main endpoints:

- `GET /stats/me/progression`
- `GET /stats/me/peer`
- `GET /stats/me/export`
- `GET /admin/stats/overview`
- `GET /admin/stats/by-context`

### Goals Module

Path:

`apps/api/src/modules/goals`

Main responsibilities:

- create learning goals
- update goal completion
- delete goals
- fetch current user goals

Main endpoint group:

- `/stats/me/goals`

### Admin Config Module

Path:

`apps/api/src/modules/admin-config`

Main responsibilities:

- store score weights
- store score thresholds
- return active analysis configuration

Main endpoints:

- `GET /admin/config`
- `PUT /admin/config`

### Pitch Templates Module

Path:

`apps/api/src/modules/pitch-templates`

Main responsibilities:

- fetch templates
- create template
- edit template
- activate/deactivate template
- delete template

Main endpoints:

- `GET /pitch-templates`
- `GET /pitch-templates/:id`
- `POST /pitch-templates`
- `PATCH /pitch-templates/:id`
- `DELETE /pitch-templates/:id`

### Audit Logs Module

Path:

`apps/api/src/modules/audit-logs`

Main responsibilities:

- list admin audit events
- persist action logs through interceptor/decorator support

Main endpoint:

- `GET /admin/audit-logs`

## Cross-Cutting Backend Components

### Common Layer

Located in `apps/api/src/common`

Includes:

- auth guards
- roles guards
- custom decorators
- audit logging support
- validators
- sanitizers
- throttling helpers

### Prisma Layer

Located in:

- `apps/api/prisma/schema.prisma`
- `apps/api/src/prisma/prisma.service.ts`

This layer defines the database model and is the source of truth for relations.

## Database Design

### Core Entities

#### User

Represents a platform account.

Key fields:

- `email`
- `passwordHash`
- `role`
- `status`
- `emailVerified`

Relations:

- one user has many analyses
- one user has many refresh tokens
- one user has many audit logs as actor
- one user has many verification tokens
- one user has many password reset tokens
- one user has many goals

#### Analysis

Represents one scored pitch submission.

Key fields:

- `userId`
- `context`
- `inputText`
- `inputTextHash`
- `versionIndex`
- score fields
- `deletedAt`

Relations:

- belongs to one user
- has many recommendations

#### Recommendation

Represents one improvement suggestion linked to an analysis.

Relations:

- belongs to one analysis

#### RefreshToken

Represents a persisted refresh token record for session rotation and revocation.

Relations:

- belongs to one user

#### AnalysisConfig

Stores scoring weights and threshold rules for the analysis engine.

Purpose:

- controls global scoring behavior
- configurable by admin pages

#### PitchTemplate

Stores reusable example templates for different interview contexts.

Purpose:

- helps guide user responses
- managed by admins

#### AuditLog

Stores administrative and sensitive action history.

Key fields:

- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `metadata`

Relations:

- belongs to one actor user

#### VerificationToken

Stores email verification tokens.

Relations:

- belongs to one user

#### PasswordResetToken

Stores password reset tokens.

Relations:

- belongs to one user

#### UserGoal

Stores user improvement goals.

Relations:

- belongs to one user

### Database Relation Summary

```text
User
 ├─< Analysis
 │    └─< Recommendation
 ├─< RefreshToken
 ├─< AuditLog
 ├─< VerificationToken
 ├─< PasswordResetToken
 └─< UserGoal

AnalysisConfig
PitchTemplate
```

### Role Model

Enums:

- `Role.ADMIN`
- `Role.USER`

This affects:

- frontend route visibility
- protected page access
- backend role guards
- admin management screens

### User Status Model

Enums:

- `ACTIVE`
- `SUSPENDED`
- `BANNED`

This affects:

- login access
- admin moderation actions

### Interview Context Model

Enums:

- `FORMAL`
- `STARTUP`
- `TECHNICAL`
- `CREATIVE`

This affects:

- analysis scoring context
- template filtering
- frontend badges and icons

## Current Feature Map

### Auth Features

- registration
- login
- refresh token flow
- logout
- email verification
- password reset
- auth error normalization on frontend

### User Features

- protected dashboard
- profile management
- goal tracking
- personal analysis history
- progression and peer statistics

### Analysis Features

- submit text for analysis
- weighted scoring
- recommendations generation
- history pagination
- PDF export path support

### Admin Features

- admin overview
- user list and status toggle
- score config management
- template management
- audit log viewer

## Page Design Guidance

Use this when creating or redesigning pages.

### 1. Match the Existing Route Boundaries

Use the existing route groups:

- public content goes in plain `app/`
- auth flows go in `(auth)`
- user product pages go in `(dashboard)`
- admin tools go in `(admin)`

Do not mix admin tools into user dashboard routes.

### 2. Keep One Page, One Main Purpose

Each page should answer one clear user need:

- dashboard = summary and next actions
- history = list and pagination
- detail pages = focused content and actions
- admin pages = operational control

Avoid pages that combine too many unrelated tools.

### 3. Use the Shared UI Layer

Prefer these primitives:

- `Card`
- `Button`
- `Badge`
- `Alert`
- `Modal`
- `Progress`
- `Skeleton`
- `Toast`

This keeps pages visually consistent and easier to maintain.

### 4. Follow Existing Data Flow

Frontend data should usually flow as:

```text
page component
  -> hook/service/lib api
  -> backend endpoint
  -> Nest service
  -> Prisma
```

Do not place backend-specific logic directly in page components.

### 5. Make Admin Pages Operational, Not Marketing-Like

Admin pages should prioritize:

- quick scanning
- data density
- clear actions
- explicit permissions
- safe destructive actions

Prefer tables, filters, badges, summaries, and confirmations over decorative layouts.

### 6. Keep Form Contracts Aligned With API Contracts

Before designing a new form:

- verify backend DTO shape
- verify HTTP method
- verify route path
- verify response field names

This project already had contract mismatches before, so design and implementation should always check backend shape first.

### 7. Build for Error and Loading States Explicitly

Every data page should clearly define:

- initial loading state
- empty state
- recoverable error state
- success path

Use:

- `PageLoader`
- `Alert`
- skeletons
- toast messages

### 8. Reuse Layout Shells

Current layout shells:

- root layout
- dashboard layout
- admin layout

New pages should inherit the correct shell instead of re-implementing headers/navigation.

## Design Recommendations For Future Pages

When adding a new page, define:

1. route
2. audience
3. required role
4. primary API dependencies
5. empty/loading/error states
6. main actions
7. success confirmation behavior

Recommended mini template:

```text
Page:
Audience:
Route:
Role:
Primary API calls:
Main actions:
Failure states:
Components reused:
```

## Suggested Next Documentation Files

If you want deeper docs later, split this into:

- `docs/frontend-pages.md`
- `docs/backend-modules.md`
- `docs/database-schema.md`
- `docs/design-system-guidelines.md`

## Important Notes

- The backend contract should remain the source of truth for page behavior.
- Shared types should be kept aligned with actual API responses.
- Admin navigation and dashboard navigation should stay clearly separated.
- Any new page should be added with at least one regression test if it depends on API data or permissions.
