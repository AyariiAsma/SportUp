-- CreateEnum
CREATE TYPE "PRType" AS ENUM ('BEST_1K', 'BEST_5K', 'BEST_10K', 'HALF_MARATHON', 'MARATHON', 'LONGEST_DISTANCE', 'FASTEST_PACE');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "GoalTargetType" AS ENUM ('DISTANCE_KM', 'DURATION_MIN', 'ACTIVITIES_COUNT');

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportType" "SportActivityType" NOT NULL DEFAULT 'RUN',
    "distanceM" DOUBLE PRECISION NOT NULL,
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLng" DOUBLE PRECISION NOT NULL,
    "endLat" DOUBLE PRECISION NOT NULL,
    "endLng" DOUBLE PRECISION NOT NULL,
    "polyline" JSONB NOT NULL,
    "elevationGainM" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_efforts" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "elapsedTimeSec" INTEGER NOT NULL,
    "movingTimeSec" INTEGER NOT NULL,
    "avgSpeedKmh" DOUBLE PRECISION NOT NULL,
    "avgPaceSec" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_efforts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportType" "SportActivityType" NOT NULL DEFAULT 'RUN',
    "type" "PRType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "activityId" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportType" "SportActivityType" NOT NULL DEFAULT 'RUN',
    "period" "GoalPeriod" NOT NULL DEFAULT 'WEEKLY',
    "targetType" "GoalTargetType" NOT NULL DEFAULT 'DISTANCE_KM',
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "segments_startLat_startLng_idx" ON "segments"("startLat", "startLng");

-- CreateIndex
CREATE INDEX "segments_sportType_idx" ON "segments"("sportType");

-- CreateIndex
CREATE INDEX "segments_creatorId_idx" ON "segments"("creatorId");

-- CreateIndex
CREATE INDEX "segment_efforts_segmentId_elapsedTimeSec_idx" ON "segment_efforts"("segmentId", "elapsedTimeSec");

-- CreateIndex
CREATE INDEX "segment_efforts_userId_segmentId_idx" ON "segment_efforts"("userId", "segmentId");

-- CreateIndex
CREATE INDEX "segment_efforts_activityId_idx" ON "segment_efforts"("activityId");

-- CreateIndex
CREATE INDEX "personal_records_userId_idx" ON "personal_records"("userId");

-- CreateIndex
CREATE INDEX "personal_records_type_idx" ON "personal_records"("type");

-- CreateIndex
CREATE UNIQUE INDEX "personal_records_userId_sportType_type_key" ON "personal_records"("userId", "sportType", "type");

-- CreateIndex
CREATE INDEX "athlete_goals_userId_period_startDate_idx" ON "athlete_goals"("userId", "period", "startDate");

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_efforts" ADD CONSTRAINT "segment_efforts_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_efforts" ADD CONSTRAINT "segment_efforts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "run_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_efforts" ADD CONSTRAINT "segment_efforts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "run_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_goals" ADD CONSTRAINT "athlete_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
