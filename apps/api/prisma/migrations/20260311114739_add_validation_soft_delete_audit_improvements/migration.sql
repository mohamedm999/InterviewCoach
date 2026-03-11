/*
  Warnings:

  - Added the required column `updatedAt` to the `analyses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'BANNED';

-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "analysis_config" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "weights" DROP DEFAULT,
ALTER COLUMN "thresholds" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pitch_templates" ADD COLUMN     "createdBy" UUID;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "user_goals" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentScore" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "usedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "analyses_deletedAt_idx" ON "analyses"("deletedAt");

-- CreateIndex
CREATE INDEX "analysis_config_version_idx" ON "analysis_config"("version");

-- CreateIndex
CREATE INDEX "analysis_config_isActive_idx" ON "analysis_config"("isActive");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "recommendations_category_idx" ON "recommendations"("category");

-- CreateIndex
CREATE INDEX "recommendations_priority_idx" ON "recommendations"("priority");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "user_goals_isCompleted_idx" ON "user_goals"("isCompleted");

-- CreateIndex
CREATE INDEX "verification_tokens_token_idx" ON "verification_tokens"("token");
