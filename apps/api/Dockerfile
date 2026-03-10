### ----- Stage 1: Prune monorepo with turbo -----
FROM node:18-alpine AS pruner

RUN apk add --no-cache libc6-compat
RUN npm install -g turbo

WORKDIR /app

# Copy entire monorepo to allow turbo to resolve workspace graph
COPY . .

# Prune to only the api package and its dependencies
RUN turbo prune api --docker

### ----- Stage 2: Install & Build -----
FROM node:18-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies from pruned lockfile
COPY --from=pruner /app/out/json/ .
RUN npm ci

# Copy pruned source code
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/turbo.json ./turbo.json

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build with turbo (shared → api, respects dependency graph)
RUN npx turbo run build --filter=api

### ----- Stage 3: Production runner -----
FROM node:18-alpine AS runner

WORKDIR /app

RUN apk add --no-cache bash

# Copy production artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3001

# Create entrypoint script for running migrations
RUN apk add --no-cache bash
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/package.json ./

# Run the application with migrations
CMD ["sh", "-c", "cd apps/api && npm run deploy && node dist/main"]