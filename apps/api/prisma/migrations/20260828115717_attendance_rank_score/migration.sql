-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'RANK_UP';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rankScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "event_participants" ADD COLUMN     "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "attendanceAt" TIMESTAMP(3),
ADD COLUMN     "distanceAwardedKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0;

