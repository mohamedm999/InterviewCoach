
## Forbidden Directories
- node_modules/
- build/
- dist/
- .git/
- coverage/
- .next/
- apps/api/dist/
- apps/web/.next/

## On-Demand Docs (use @path, do not load by default)
- @docs/ — reference only when a task explicitly needs it

## Model Switching Rules
- Default: sonnet
- /model haiku for: file reads, grep, formatting, boilerplate, simple lookups
- /model opusplan for: architecture, complex refactors, deep planning
- /model opus for: race conditions, security review, hard bugs
- /model sonnet to return to default
- If haiku fails twice on same task → switch to sonnet

## Session Rules
- Run /clear between unrelated tasks
- Run /compact when context reaches 70%
- Use subagents for research: "use a subagent to investigate X"
- Reference files with @ instead of asking Claude to search
- Run session-handoff skill at end of every session

## Stack
- Monorepo: Turborepo + npm workspaces
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind (port 3001)
- Backend: NestJS + Prisma + PostgreSQL + Socket.io + JWT/Passport
- Shared: @interviewcoach/shared package
- Testing: Jest (both apps), Playwright (e2e)
- Infra: Docker Compose, Sentry

## Commands
- `npm run dev` — start all apps (turbo)
- `npm run dev:api` — NestJS API only (port 3000)
- `npm run dev:web` — Next.js web only (port 3001)
- `npm run build` — build all
- `npm run test` — run all tests
- `npm run test:api` — API tests (jest)
- `npm run test:web` — web tests (jest)
- `npm run lint` — lint all
- `npm run db:generate` — prisma generate
- `npm run db:migrate` — prisma migrate
- `npm run db:seed` — seed database
- `npm run docker:up` — start docker services
- `npm run docker:down` — stop docker services

## Conventions
- API: `apps/api/src/` — NestJS modules, controllers, services
- Web: `apps/web/src/` — Next.js app router, components
- Shared: `packages/shared/` — shared types and utils
- Prisma schema: `apps/api/prisma/schema.prisma`
- API uses argon2 for password hashing
- Auth: JWT + Passport strategies

## MCP Servers
- No MCP servers configured (none detected)
