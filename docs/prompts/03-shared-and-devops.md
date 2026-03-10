# Prompt 03 — Shared Package & DevOps (Docker, CI/CD)

---

## Prompt 3.1 — Shared Package (Types & Constants)

```
Configure packages/shared to share code between API and Web:

1. Initialize packages/shared/package.json:
   - Name: "@interviewcoach/shared"
   - Main: "dist/index.js"
   - Types: "dist/index.d.ts"
   - Scripts: "build": "tsc", "dev": "tsc -w"

2. Create src/index.ts and export:
   - Enums: Role, UserStatus, Context, Priority, RecommendationCategory.
   - Interfaces (DTO mirrors):
     - RegisterDto, LoginDto, AuthResponse
     - UserResponse
     - CreateAnalysisDto, AnalysisResponse
     - RecommendationResponse
   - Constants (if any):
     - MAX_PITCH_LENGTH = 5000
     - MIN_PITCH_LENGTH = 50

3. Usage:
   - In apps/api/package.json: dependencies: { "@interviewcoach/shared": "*" }
   - In apps/web/package.json: dependencies: { "@interviewcoach/shared": "*" }
   - Import shared types in both apps to ensure consistency.
```

---

## Prompt 3.2 — Docker Configuration

```
Create Dockerfiles for production deployment:

1. apps/api/Dockerfile:
   - Multi-stage build (builder, runner).
   - Use node:18-alpine.
   - Install dependencies (npm ci).
   - Copy source, prisma schema.
   - Build (nest build).
   - Prune devDependencies.
   - CMD ["node", "dist/main"]

2. apps/web/Dockerfile:
   - Multi-stage build.
   - Use node:18-alpine.
   - Build Next.js (npm run build).
   - Copy .next/standalone (enable standalone mode in next.config.js).
   - CMD ["node", "server.js"]

3. docker-compose.yml:
   - Service: db (postgres:15-alpine)
     - Environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
     - Volumes: db_data:/var/lib/postgresql/data
   - Service: api
     - Build: context: . dockerfile: apps/api/Dockerfile
     - Environment: DATABASE_URL=postgresql://..., JWT_SECRETS...
     - Depends_on: db
     - Ports: 3001:3001
   - Service: web
     - Build: context: . dockerfile: apps/web/Dockerfile
     - Environment: NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
     - Ports: 3000:3000

4. .dockerignore:
   - node_modules
   - dist
   - .git
```

---

## Prompt 3.3 — CI/CD Pipeline (GitHub Actions)

```
Create .github/workflows/ci.yml:

1. Triggers:
   - push: branches: [main]
   - pull_request: branches: [main]

2. Job: Build-and-Test
   - Runs on ubuntu-latest.
   - Strategy matrix: node-version [18.x].
   - Steps:
     - Checkout code.
     - Install dependencies (npm ci -w root).
     - Lint (npm run lint --workspaces).
     - Build Shared (npm run build -w packages/shared).
     - Test API (npm run test -w apps/api).
     - Test Web (npm run test -w apps/web).
     - Build API (npm run build -w apps/api).
     - Build Web (npm run build -w apps/web).

3. Job: Docker-Publish (only on push to main):
   - Needs: Build-and-Test.
   - Steps:
     - Login to Docker Hub.
     - Build and Push API image (interviewcoach/api:latest).
     - Build and Push Web image (interviewcoach/web:latest).
```

---

## Prompt 3.4 — Final Verification & Schema Sync

```
Ensure everything connects:

1. Database URL:
   - In docker-compose, API connects to 'db' hostname.
   - In local dev, API connects to 'localhost'.

2. CORS:
   - API must allow Web origin (http://localhost:3000 or production domain).

3. Migrations:
   - Add a 'deploy' script or entrypoint in API Dockerfile to run `npx prisma migrate deploy` before starting nest app.
```
