-- CreateEnum
CREATE TYPE "SportActivityType" AS ENUM ('RUN', 'TRAIL_RUN', 'WALK', 'HIKE', 'RIDE', 'SWIM', 'YOGA', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'ONLY_ME');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DISCARDED');

-- AlterTable
ALTER TABLE "run_sessions" ADD COLUMN     "avgCadence" INTEGER,
ADD COLUMN     "avgHeartRate" INTEGER,
ADD COLUMN     "avgSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "calories" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clientSessionId" TEXT,
ADD COLUMN     "elevationGainM" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "elevationLossM" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxHeartRate" INTEGER,
ADD COLUMN     "maxSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "movingDurationSec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sourceDevice" TEXT DEFAULT 'SportUp Mobile',
ADD COLUMN     "sportType" "SportActivityType" NOT NULL DEFAULT 'RUN',
ADD COLUMN     "status" "ActivityStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "visibility" "ActivityVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE UNIQUE INDEX "run_sessions_clientSessionId_key" ON "run_sessions"("clientSessionId");

-- CreateIndex
CREATE INDEX "run_sessions_userId_startTime_idx" ON "run_sessions"("userId", "startTime");

-- CreateIndex
CREATE INDEX "run_sessions_sportType_idx" ON "run_sessions"("sportType");

-- CreateIndex
CREATE INDEX "run_sessions_visibility_idx" ON "run_sessions"("visibility");

-- CreateIndex
CREATE INDEX "run_sessions_createdAt_idx" ON "run_sessions"("createdAt");
