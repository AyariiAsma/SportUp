import { AttendanceStatus, Difficulty, Prisma, RunningLevel } from '@prisma/client';
import { computeAttendancePoints, levelForScore, rankProgress } from '@sportup/shared';
import { prisma } from '../../prisma/client';

export interface AttendanceChangeResult {
  attendance: AttendanceStatus;
  pointsAwarded: number;
  rankScore: number;
  runningLevel: RunningLevel;
  previousRunningLevel: RunningLevel;
}

/**
 * Apply an organizer's attendance decision for one participant and keep the
 * runner's rank score in sync. Awards are stored on the participant row so a
 * decision can be changed later without double counting.
 */
export async function applyAttendanceDecision(params: {
  participantId: string;
  attendance: AttendanceStatus;
  event: { id: string; title: string; distanceKm: number | null; difficulty: Difficulty | null };
}): Promise<AttendanceChangeResult> {
  const { participantId, attendance, event } = params;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const participant = await tx.eventParticipant.findUniqueOrThrow({
      where: { id: participantId },
      include: { user: { select: { id: true, rankScore: true, totalDistanceKm: true, runningLevel: true } } },
    });

    const points = attendance === 'PRESENT'
      ? computeAttendancePoints({ distanceKm: event.distanceKm, difficulty: event.difficulty })
      : 0;
    const distanceKm = attendance === 'PRESENT' ? (event.distanceKm ?? 0) : 0;

    // Reverse whatever was previously granted, then grant the new amount
    const rankScore = Math.max(0, participant.user.rankScore - participant.pointsAwarded + points);
    const totalDistanceKm = Math.max(
      0,
      participant.user.totalDistanceKm - participant.distanceAwardedKm + distanceKm,
    );
    const runningLevel = levelForScore(rankScore) as RunningLevel;
    const previousRunningLevel = participant.user.runningLevel;

    await tx.eventParticipant.update({
      where: { id: participantId },
      data: {
        attendance,
        attendanceAt: attendance === 'PENDING' ? null : new Date(),
        pointsAwarded: points,
        distanceAwardedKm: distanceKm,
      },
    });

    await tx.user.update({
      where: { id: participant.userId },
      data: { rankScore, totalDistanceKm, runningLevel },
    });

    if (attendance === 'PRESENT') {
      await tx.notification.create({
        data: {
          userId: participant.userId,
          type: 'ATTENDANCE_CONFIRMED',
          title: 'Presence Confirmed ✅',
          body: `Your presence at "${event.title}" was confirmed — you earned ${points} rank points!`,
          data: { eventId: event.id, points, rankScore },
        },
      });
    }

    if (runningLevel !== previousRunningLevel) {
      const promoted = levelOrder(runningLevel) > levelOrder(previousRunningLevel);
      await tx.notification.create({
        data: {
          userId: participant.userId,
          type: 'RANK_UP',
          title: promoted ? 'New Rank Unlocked 🏆' : 'Rank Updated',
          body: promoted
            ? `You are now an ${titleCase(runningLevel)} runner with ${rankScore} points!`
            : `Your rank is now ${titleCase(runningLevel)} with ${rankScore} points.`,
          data: { eventId: event.id, runningLevel, rankScore },
        },
      });
    }

    return { attendance, pointsAwarded: points, rankScore, runningLevel, previousRunningLevel };
  });
}

export function buildRank(score: number) {
  const progress = rankProgress(score);
  return { score, ...progress };
}

function levelOrder(level: RunningLevel): number {
  return ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].indexOf(level);
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
