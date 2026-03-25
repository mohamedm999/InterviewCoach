# InterviewCoach Audit Report

Date: 2026-03-27
Audited areas: frontend, backend, integration layer, Docker/compose, runtime configuration

## Executive Summary

### Critical

1. `apps/web` does not build. The custom `Tabs` component only supports controlled usage, but multiple screens use it as uncontrolled with `defaultValue`, and `npm run build:web` fails on that mismatch. Evidence: [apps/web/src/components/ui/Tabs.tsx](C:\laragon\www\InterviewCoach\apps\web\src\components\ui\Tabs.tsx), [apps/web/src/components/analysis/AnalysisResult.tsx:155](C:\laragon\www\InterviewCoach\apps\web\src\components\analysis\AnalysisResult.tsx#L155), [apps/web/src/components/analysis/RecommendationsList.tsx:131](C:\laragon\www\InterviewCoach\apps\web\src\components\analysis\RecommendationsList.tsx#L131).

2. The Docker topology is internally inconsistent and will fail in containerized deployments. The API defaults to port `3000`, the compose file exposes `3001:3001`, and the web container points to `http://api:3001/api/v1`. Evidence: [apps/api/.env.example:9](C:\laragon\www\InterviewCoach\apps\api\.env.example#L9), [apps/api/src/main.ts:40](C:\laragon\www\InterviewCoach\apps\api\src\main.ts#L40), [docker-compose.yml:27](C:\laragon\www\InterviewCoach\docker-compose.yml#L27), [docker-compose.yml:47](C:\laragon\www\InterviewCoach\docker-compose.yml#L47).

3. The web Docker image is configured to start `apps/web/.next/standalone/server.js`, but the Next config never enables standalone output. The image is built for a file that is not produced. Evidence: [apps/web/Dockerfile:48](C:\laragon\www\InterviewCoach\apps\web\Dockerfile#L48), [apps/web/next.config.ts](C:\laragon\www\InterviewCoach\apps\web\next.config.ts).

4. The compose file runs in `production` while silently injecting hardcoded JWT fallback secrets. That is an unacceptable security default. Evidence: [docker-compose.yml:30](C:\laragon\www\InterviewCoach\docker-compose.yml#L30), [docker-compose.yml:31](C:\laragon\www\InterviewCoach\docker-compose.yml#L31).

## Detailed Issues

### 1. Project Structure & Maintainability

#### High

- Duplicated frontend domain types are spread across pages, services, and `src/types`, which guarantees contract drift. `ProgressionItem`, `PeerStats`, `Goal`, and admin shapes are redefined multiple times instead of being imported from a single source. Evidence: [apps/web/src/services/statistics.service.ts:3](C:\laragon\www\InterviewCoach\apps\web\src\services\statistics.service.ts#L3), [apps/web/src/services/goals.service.ts:3](C:\laragon\www\InterviewCoach\apps\web\src\services\goals.service.ts#L3), [apps/web/src/app/(dashboard)/dashboard/page.tsx:41](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\dashboard\page.tsx#L41), [apps/web/src/app/(dashboard)/statistics/page.tsx:17](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\statistics\page.tsx#L17), [apps/web/src/app/(admin)/admin/page.tsx:18](C:\laragon\www\InterviewCoach\apps\web\src\app\(admin)\admin\page.tsx#L18), [apps/web/src/types/index.ts:89](C:\laragon\www\InterviewCoach\apps\web\src\types\index.ts#L89).
  Fix: move all API response contracts into `packages/shared` or `apps/web/src/types/api.ts`, delete page-local interface copies, and force all services/pages to import the same definitions.

#### Medium

- The monorepo layout is underused. `packages/shared` contains schemas and DTOs, but the frontend and backend still re-declare the same shapes and validation rules locally. This defeats the point of a shared package.
  Fix: promote `packages/shared` into the single contract layer for request/response DTOs, enums, and validation constants. Make it a release blocker if a local duplicate is introduced.

- Global CSS contains duplicate animation names and utility classes, which makes later overrides non-deterministic. Evidence: [apps/web/src/app/globals.css:244](C:\laragon\www\InterviewCoach\apps\web\src\app\globals.css#L244), [apps/web/src/app/globals.css:259](C:\laragon\www\InterviewCoach\apps\web\src\app\globals.css#L259), [apps/web/src/app/globals.css:317](C:\laragon\www\InterviewCoach\apps\web\src\app\globals.css#L317), [apps/web/src/app/globals.css:328](C:\laragon\www\InterviewCoach\apps\web\src\app\globals.css#L328).
  Fix: delete the duplicate `slideIn` / `.animate-slideIn` block and keep one canonical animation definition.

- Root lint scripts are mutation scripts, not verification scripts. `apps/api` runs `eslint ... --fix`, which changes the working tree during linting and makes CI/audit runs unsafe. Evidence: [apps/api/package.json](C:\laragon\www\InterviewCoach\apps\api\package.json).
  Fix: split lint into `lint` and `lint:fix`. `lint` must be read-only in all packages.

### 2. Frontend (UI/UX + Code Quality)

#### Critical

- The web build is currently broken by the `Tabs` API mismatch. The custom component requires `value` and `onValueChange`; consumers pass `defaultValue`. This is not a warning, it is a compile failure.
  Fix: choose one API and make it consistent. Either:
  1. Add uncontrolled support to `Tabs` with `defaultValue` and internal state.
  2. Convert all usages to controlled state with `useState`.
  Do not keep both half-implemented.

#### High

- `next.config.ts` contains `transpilePackages: ['@repo/ui']`, but there is no such workspace in this repo. That is leftover config, not architecture. Evidence: [apps/web/next.config.ts:6](C:\laragon\www\InterviewCoach\apps\web\next.config.ts#L6).
  Fix: remove the dead package reference or replace it with real internal packages only.

- The project is explicitly configured to ignore Next.js TypeScript build errors. Evidence: [apps/web/next.config.ts:8](C:\laragon\www\InterviewCoach\apps\web\next.config.ts#L8).
  Fix: remove `ignoreBuildErrors: true`. The codebase already has real compile defects; suppressing them is exactly how broken releases happen.

- Input validation rules are inconsistent across layers. Shared validation says analysis content minimum is `10`, the screen requires `50`, and the backend accepts any non-empty string. Evidence: [packages/shared/src/index.ts:144](C:\laragon\www\InterviewCoach\packages\shared\src\index.ts#L144), [packages/shared/src/index.ts:117](C:\laragon\www\InterviewCoach\packages\shared\src\index.ts#L117), [apps/web/src/app/(dashboard)/analysis/new/page.tsx:98](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\analysis\new\page.tsx#L98), [apps/api/src/modules/analyses/analyses.service.ts:49](C:\laragon\www\InterviewCoach\apps\api\src\modules\analyses\analyses.service.ts#L49).
  Fix: define one source of truth for `MIN_PITCH_LENGTH` and `MAX_PITCH_LENGTH` in `packages/shared`, enforce it in the backend DTO, and consume the same constants in the form.

- The analysis page pretends to have real-time progress, but the backend only broadcasts completion. There is no actual progress lifecycle wired through. Evidence: [apps/web/src/app/(dashboard)/analysis/new/page.tsx:71](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\analysis\new\page.tsx#L71), [apps/api/src/modules/analyses/analyses.service.ts:175](C:\laragon\www\InterviewCoach\apps\api\src\modules\analyses\analyses.service.ts#L175), [apps/api/src/modules/analyses/analyses.gateway.ts:86](C:\laragon\www\InterviewCoach\apps\api\src\modules\analyses\analyses.gateway.ts#L86).
  Fix: either emit progress checkpoints from the service or remove the fake progress UI and show a simple pending state.

- Route protection in middleware trusts `jwtDecode` on cookies without signature verification. That is not authorization; it is UI gating based on attacker-controlled data. Evidence: [apps/web/middleware.ts:35](C:\laragon\www\InterviewCoach\apps\web\middleware.ts#L35).
  Fix: stop role-gating in middleware based on decoded claims unless the token is verified server-side. Prefer backend-enforced redirects using a verified `/users/me` session check.

#### Medium

- Theme initialization is effect-driven and causes a hydration-time visual flip. It also violates the current lint rules. Evidence: [apps/web/src/components/theme/ThemeProvider.tsx:43](C:\laragon\www\InterviewCoach\apps\web\src\components\theme\ThemeProvider.tsx#L43).
  Fix: resolve theme before first paint with an inline theme script in `layout.tsx`, initialize state from that value, and remove the post-mount correction path.

- Auth protection is duplicated in layout and component level wrappers. `DashboardLayout` redirects manually while individual pages also wrap with `ProtectedRoute`. Evidence: [apps/web/src/app/(dashboard)/layout.tsx:20](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\layout.tsx#L20), [apps/web/src/components/auth/ProtectedRoute.tsx:15](C:\laragon\www\InterviewCoach\apps\web\src\components\auth\ProtectedRoute.tsx#L15).
  Fix: keep one guard strategy. The correct place is the segment layout, not every page.

- `analysis/new` stores derived `charCount` in state and mutates form state from effects. That is unnecessary render churn and already flagged by lint. Evidence: [apps/web/src/app/(dashboard)/analysis/new/page.tsx:33](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\analysis\new\page.tsx#L33), [apps/web/src/app/(dashboard)/analysis/new/page.tsx:44](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\analysis\new\page.tsx#L44), [apps/web/src/app/(dashboard)/analysis/new/page.tsx:52](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\analysis\new\page.tsx#L52).
  Fix: derive `charCount` directly from `formData.content.length` and initialize query-param state in the initial state function or a dedicated reducer.

- `console.log` remains in production-facing UI code. Evidence: [apps/web/src/app/(dashboard)/analysis/new/page.tsx:68](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\analysis\new\page.tsx#L68).
  Fix: remove it or replace with a controlled debug logger behind environment gating.

### 3. Backend (API + Logic)

#### High

- `UsersService.updateStatus` updates blindly and relies on Prisma throwing if the user does not exist. That bypasses your explicit API error model and risks surfacing an inconsistent server error. Evidence: [apps/api/src/modules/users/users.service.ts:100](C:\laragon\www\InterviewCoach\apps\api\src\modules\users\users.service.ts#L100).
  Fix: fetch or `updateMany` first, return `404` when no record exists, and keep response shape consistent with the rest of the module.

- Soft delete is not consistently enforced. Statistics export includes deleted analyses, admin overview counts all analyses, PDF export loads analyses without `deletedAt: null`, and recommendations can still be read for deleted analyses. Evidence: [apps/api/src/modules/statistics/statistics.service.ts:38](C:\laragon\www\InterviewCoach\apps\api\src\modules\statistics\statistics.service.ts#L38), [apps/api/src/modules/statistics/statistics.service.ts:120](C:\laragon\www\InterviewCoach\apps\api\src\modules\statistics\statistics.service.ts#L120), [apps/api/src/modules/pdf-export/pdf-export.service.ts:26](C:\laragon\www\InterviewCoach\apps\api\src\modules\pdf-export\pdf-export.service.ts#L26), [apps/api/src/modules/recommendations/recommendations.service.ts:18](C:\laragon\www\InterviewCoach\apps\api\src\modules\recommendations\recommendations.service.ts#L18).
  Fix: centralize a reusable `activeAnalysisWhere` predicate and apply `deletedAt: null` everywhere an analysis is read, counted, exported, or joined.

- Audit logging is fragile. The interceptor uses an async function inside `tap`, which ESLint already flags as misused, and failures are dumped with `console.error` instead of structured logging. Evidence: [apps/api/src/common/interceptors/audit-log.interceptor.ts:41](C:\laragon\www\InterviewCoach\apps\api\src\common\interceptors\audit-log.interceptor.ts#L41).
  Fix: switch to `mergeMap`/`from` or fire-and-forget explicitly with `void` plus logger-based error handling. Do not bury audit reliability behind RxJS side effects.

- Mail fallback behavior is unsafe for production-like environments. If mail credentials are missing, the service creates Ethereal accounts, disables TLS verification for configured SMTP, logs reset URLs, and exposes Ethereal credentials in logs. Evidence: [apps/api/src/modules/mail/mail.service.ts:27](C:\laragon\www\InterviewCoach\apps\api\src\modules\mail\mail.service.ts#L27), [apps/api/src/modules/mail/mail.service.ts:35](C:\laragon\www\InterviewCoach\apps\api\src\modules\mail\mail.service.ts#L35), [apps/api/src/modules/mail/mail.service.ts:44](C:\laragon\www\InterviewCoach\apps\api\src\modules\mail\mail.service.ts#L44), [apps/api/src/modules/mail/mail.service.ts:72](C:\laragon\www\InterviewCoach\apps\api\src\modules\mail\mail.service.ts#L72).
  Fix: fail fast in production when mail config is missing, remove `rejectUnauthorized: false`, and stop logging secrets or reset URLs outside an explicit local-dev mode.

- LLM integration is frozen on `gpt-3.5-turbo` and hard-codes behavior in the service. Evidence: [apps/api/src/modules/analyses/llm-coaching.service.ts:44](C:\laragon\www\InterviewCoach\apps\api\src\modules\analyses\llm-coaching.service.ts#L44).
  Fix: move model selection, timeout, and enable/disable flags into validated config, and return a typed provider error when the model layer is unavailable.

#### Medium

- Config loading is weak. `ConfigModule` only points to `.env.development` and `.env`, but there is no schema validation and no startup failure for missing required secrets. Evidence: [apps/api/src/app.module.ts:26](C:\laragon\www\InterviewCoach\apps\api\src\app.module.ts#L26).
  Fix: add `validationSchema` or `validate()` to `ConfigModule.forRoot`, mark required secrets as mandatory in non-test environments, and stop relying on ad hoc `process.env` access across the codebase.

- `HttpExceptionFilter` does not normalize payload structure. It forwards `exception.getResponse()` directly, so `message` can be a string, array, or nested object depending on source. Evidence: [apps/api/src/common/filters/http-exception.filter.ts:27](C:\laragon\www\InterviewCoach\apps\api\src\common\filters\http-exception.filter.ts#L27).
  Fix: standardize to `{ success: false, error: { code, message, details }, requestId, timestamp }` and keep it stable for every exception class.

- Logging is too shallow. The request logger records only method, URL, and duration, and does not log status, actor, request id, or failures. Evidence: [apps/api/src/common/interceptors/logging.interceptor.ts](C:\laragon\www\InterviewCoach\apps\api\src\common\interceptors\logging.interceptor.ts).
  Fix: add status code, request id, user id when available, and error-level logging on exceptions. Emit JSON logs, not free-form strings.

### 4. API & Integration Layer

#### Critical

- Local and Docker API origins disagree. The frontend defaults to `http://localhost:3000/api/v1`, but the API example points the app URL and CORS to `3001`, while the web dev server itself runs on `3001`. This is not a coherent routing model. Evidence: [apps/web/src/config/api.config.ts:1](C:\laragon\www\InterviewCoach\apps\web\src\config\api.config.ts#L1), [apps/web/package.json](C:\laragon\www\InterviewCoach\apps\web\package.json), [apps/api/.env.example:11](C:\laragon\www\InterviewCoach\apps\api\.env.example#L11), [apps/api/.env.example:29](C:\laragon\www\InterviewCoach\apps\api\.env.example#L29).
  Fix: choose one canonical API port per environment. Then update:
  1. `apps/api/.env.example`
  2. `apps/api/src/main.ts`
  3. `docker-compose.yml`
  4. `apps/web/src/config/api.config.ts`
  5. `apps/web/next.config.ts`

#### High

- The statistics API contract is semantically wrong. `getPeerStatistics` returns `contextBreakdown` aggregated across all users, while the UI presents it as the current user's performance by context. Evidence: [apps/api/src/modules/statistics/statistics.service.ts:157](C:\laragon\www\InterviewCoach\apps\api\src\modules\statistics\statistics.service.ts#L157), [apps/api/src/modules/statistics/statistics.service.ts:179](C:\laragon\www\InterviewCoach\apps\api\src\modules\statistics\statistics.service.ts#L179), [apps/web/src/app/(dashboard)/statistics/page.tsx](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\statistics\page.tsx).
  Fix: split the response into `myContextBreakdown` and `platformContextBreakdown`, and rename fields so the UI cannot mislabel platform aggregates as personal data.

- The frontend error layer is compensating for unstable backend responses instead of consuming a stable contract. Evidence: [apps/web/src/utils/errorHandler.ts](C:\laragon\www\InterviewCoach\apps\web\src\utils\errorHandler.ts), [apps/api/src/common/filters/http-exception.filter.ts](C:\laragon\www\InterviewCoach\apps\api\src\common\filters\http-exception.filter.ts).
  Fix: standardize error envelopes in the backend and simplify the frontend handler to mapping by `error.code`, not parsing arbitrary strings.

### 5. Infrastructure & DevOps

#### Critical

- The web image startup command depends on standalone build artifacts that are not produced. This is a release blocker. Evidence: [apps/web/Dockerfile:48](C:\laragon\www\InterviewCoach\apps\web\Dockerfile#L48), [apps/web/next.config.ts](C:\laragon\www\InterviewCoach\apps\web\next.config.ts).
  Fix: add `output: 'standalone'` to `next.config.ts`, copy `.next/standalone` and `.next/static` explicitly, and verify the final image with `node server.js` from the standalone directory.

- The API and web containers are wired against the wrong API port. Evidence: [docker-compose.yml:27](C:\laragon\www\InterviewCoach\docker-compose.yml#L27), [docker-compose.yml:47](C:\laragon\www\InterviewCoach\docker-compose.yml#L47), [apps/api/src/main.ts:40](C:\laragon\www\InterviewCoach\apps\api\src\main.ts#L40).
  Fix: either set `PORT=3001` in the API service environment or change all downstream references to `3000`. Do not mix both.

#### High

- Compose sets `NODE_ENV: production` but still relies on development defaults and weak fallbacks. This is a deployment anti-pattern, not a convenience.
  Fix: require explicit secrets with no defaults in compose, provide a checked-in `.env.compose.example`, and fail container startup when mandatory variables are absent.

- The API Dockerfile is noisy and redundant. It copies package manifests twice and runs migrations on every container boot. Evidence: [apps/api/Dockerfile](C:\laragon\www\InterviewCoach\apps\api\Dockerfile).
  Fix: remove duplicate `COPY` lines, run migrations as a dedicated one-off job or entrypoint guard, and keep the API container focused on serving traffic.

### 6. Error Handling & Monitoring

#### High

- Error and success messaging is not unified. Backend endpoints return plain DTOs, `{ message }`, empty `204`, and exception payloads with shifting shapes. Frontend hooks and pages then implement their own ad hoc parsing and toast behavior.
  Fix: standardize on:
  - Success: `{ success: true, data, meta? }`
  - Error: `{ success: false, error: { code, message, details? }, requestId, timestamp }`
  Then update `api.ts`, `handleApiError`, and endpoint handlers together.

- Monitoring is partially wired but operationally thin. Sentry is initialized, but the request logger and exception filter do not consistently enrich events with request ids, actor ids, route metadata, or normalized error codes.
  Fix: add request-scoped correlation ids, propagate them into logs and Sentry, and ensure both frontend and backend send the same error code vocabulary.

#### Medium

- User-facing error feedback is inconsistent. Some pages use shared toasts, some inline alerts, some hardcoded messages, and some do both.
  Fix: define a single page-level error pattern: inline alert for form/page state plus toast only for transient background actions.

### 7. Missing or Broken Elements

#### Critical

- `npm run build:web` fails. This is a proven broken element, not a theoretical risk.
  Exact fix:
  1. Repair `Tabs` API mismatch.
  2. Remove dead `@repo/ui` transpilation config.
  3. Remove `ignoreBuildErrors`.
  4. Re-run `npm run build:web` until clean.

#### High

- The tests could not run under the current sandbox because Jest attempted worker process spawning and hit `EPERM`. That means this repo does not currently provide a sandbox-safe single-process test path via package scripts.
  Fix: add deterministic CI-safe test scripts, for example `test:ci` using `jest --runInBand` in each package.

- Several frontend files contain encoding corruption in rendered copy and icon text, which is a quality regression and a sign of inconsistent file encoding handling. Evidence: [apps/web/src/app/(admin)/admin/page.tsx](C:\laragon\www\InterviewCoach\apps\web\src\app\(admin)\admin\page.tsx), [apps/web/src/app/(admin)/admin/config/page.tsx](C:\laragon\www\InterviewCoach\apps\web\src\app\(admin)\admin\config\page.tsx), [apps/web/src/app/(admin)/admin/audit-logs/page.tsx](C:\laragon\www\InterviewCoach\apps\web\src\app\(admin)\admin\audit-logs\page.tsx), [apps/web/src/app/(dashboard)/analysis/new/page.tsx](C:\laragon\www\InterviewCoach\apps\web\src\app\(dashboard)\analysis\new\page.tsx).
  Fix: normalize source files to UTF-8, remove corrupted glyphs, and stop embedding decorative emoji in core admin UI copy.

## Verification Notes

- `npm run build:web`: failed
  - TypeScript error: `Tabs` usages pass `defaultValue` to a component that does not support it.
- `npm run build:api`: passed
- `npm run lint -- --filter=web`: failed with 35 errors and 6 warnings
- `npm run lint -- --filter=api`: failed with 5 errors and 106 warnings
- `npm run test:web`: blocked by Jest worker spawn `EPERM`
- `npm run test:api`: blocked by Jest worker spawn `EPERM`

## Optional Refactoring Plan

1. Stabilize deployment first.
   - Fix API/web port alignment.
   - Remove insecure compose defaults.
   - Make Next standalone output real and verifiable.

2. Restore build integrity.
   - Fix `Tabs`.
   - Remove `ignoreBuildErrors`.
   - Clear all current lint errors in `apps/web`.

3. Standardize the contract layer.
   - Move all shared DTOs/types/constants into `packages/shared`.
   - Enforce one error envelope and one success envelope.
   - Align frontend validation with backend validation.

4. Harden backend behavior.
   - Enforce `deletedAt: null` consistently.
   - Add config schema validation.
   - Replace weak mail and logging fallbacks with explicit environment-based behavior.

5. Simplify frontend architecture.
   - Move auth gating to layouts only.
   - Eliminate duplicate interfaces and local API parsing logic.
   - Replace fake real-time analysis progress with actual progress events or a simpler pending state.

6. Make verification trustworthy.
   - Split `lint` from `lint:fix`.
   - Add `test:ci` / `test:runInBand`.
   - Gate merges on clean web build, clean lint, and runnable tests.
