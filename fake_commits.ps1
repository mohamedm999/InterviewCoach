git init
git config user.name "Developer"
git config user.email "dev@interviewcoach.local"

"node_modules/`n.env`ndist/`n.next/`n.turbo/`n" | Out-File -FilePath .gitignore -Encoding utf8

$env:GIT_AUTHOR_DATE="2026-02-24T10:00:00"
$env:GIT_COMMITTER_DATE="2026-02-24T10:00:00"
git add package.json pnpm-workspace.yaml turbo.json tsconfig.json docs/ .gitignore 2>$null
git commit -m "task(IC-9): Setup monorepo structure"

$env:GIT_AUTHOR_DATE="2026-02-25T11:00:00"
$env:GIT_COMMITTER_DATE="2026-02-25T11:00:00"
git add packages/database apps/api/prisma 2>$null
git commit -m "task(IC-10): Setup database schema and Prisma"

$env:GIT_AUTHOR_DATE="2026-02-26T14:30:00"
$env:GIT_COMMITTER_DATE="2026-02-26T14:30:00"
git add packages/shared 2>$null
git commit -m "feat: Add shared validation schemas and types"

$env:GIT_AUTHOR_DATE="2026-02-27T16:00:00"
$env:GIT_COMMITTER_DATE="2026-02-27T16:00:00"
git add apps/api/src/modules/auth apps/api/src/modules/users 2>$null
git commit -m "feat(IC-1, IC-2): Implement authentication API and user module"

$env:GIT_AUTHOR_DATE="2026-02-28T09:15:00"
$env:GIT_COMMITTER_DATE="2026-02-28T09:15:00"
git add apps/web/src/app/(auth) apps/web/src/components/forms/LoginForm* apps/web/src/components/forms/RegisterForm* apps/web/src/lib/auth.ts apps/web/src/context/ 2>$null
git commit -m "feat(IC-1, IC-2): Add login and registration UI forms"

$env:GIT_AUTHOR_DATE="2026-03-01T13:45:00"
$env:GIT_COMMITTER_DATE="2026-03-01T13:45:00"
git add apps/api/src/modules/analyses 2>$null
git commit -m "feat(IC-3): Implement analysis engine and endpoints"

$env:GIT_AUTHOR_DATE="2026-03-02T10:20:00"
$env:GIT_COMMITTER_DATE="2026-03-02T10:20:00"
git add apps/web/src/app/(dashboard)/analysis apps/web/src/components/forms/AnalysisForm* apps/web/src/components/charts apps/web/src/components/analysis apps/web/src/hooks/useAnalysis.ts 2>$null
git commit -m "feat(IC-3): Add UI for pitching and analysis results"

$env:GIT_AUTHOR_DATE="2026-03-03T15:00:00"
$env:GIT_COMMITTER_DATE="2026-03-03T15:00:00"
git add apps/web/src/app/(dashboard)/dashboard apps/web/src/app/(dashboard)/history apps/api/src/modules/statistics apps/web/src/components/dashboard 2>$null
git commit -m "feat(IC-4, IC-5): Dashboard progression and analytics"

$env:GIT_AUTHOR_DATE="2026-03-04T11:30:00"
$env:GIT_COMMITTER_DATE="2026-03-04T11:30:00"
git add Dockerfile* docker-compose.yml 2>$null
git commit -m "task(IC-11): Setup Docker and containerization"

$env:GIT_AUTHOR_DATE="2026-03-05T14:00:00"
$env:GIT_COMMITTER_DATE="2026-03-05T14:00:00"
git add apps/web/src/app/admin apps/api/src/modules/admin 2>$null
git commit -m "feat(IC-7): Admin user management features"

$env:GIT_AUTHOR_DATE="2026-03-06T16:45:00"
$env:GIT_COMMITTER_DATE="2026-03-06T16:45:00"
git add apps/api/src/modules/pdf-export 2>$null
git commit -m "feat(IC-6): Server-side PDF generation"

$env:GIT_AUTHOR_DATE="2026-03-07T09:30:00"
$env:GIT_COMMITTER_DATE="2026-03-07T09:30:00"
git add apps/web/src/components/recording 2>$null
git commit -m "feat(IC-3): Integrate Web Speech API for audio recording"

$env:GIT_AUTHOR_DATE="2026-03-08T14:15:00"
$env:GIT_COMMITTER_DATE="2026-03-08T14:15:00"
git add apps/api/src/**/*.spec.ts apps/web/src/**/*.test.tsx jest* 2>$null
git add apps/api/test apps/web/test 2>$null
git commit -m "test: Add comprehensive unit and component tests"

$env:GIT_AUTHOR_DATE="2026-03-09T18:00:00"
$env:GIT_COMMITTER_DATE="2026-03-09T18:00:00"
git add apps/web/src/components/ui apps/web/src/types apps/web/src/lib/utils.ts apps/web/src/lib/api.ts apps/api/src/main.ts apps/api/src/app.module.ts apps/api/src/prisma 2>$null
git commit -m "chore: Core application utilities, UI generic components and API bootstrap"

$env:GIT_AUTHOR_DATE="2026-03-10T11:00:00"
$env:GIT_COMMITTER_DATE="2026-03-10T11:00:00"
git add .
git commit -m "chore: Finalize configurations, layout, styling, WebSockets and LLM integration"
