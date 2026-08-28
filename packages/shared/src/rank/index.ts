import { Difficulty, RunningLevel } from '../types/enums';

// ─── Rank Scoring ────────────────────────────────────────
// A runner earns points only when the event organizer confirms
// their presence at a run they participated in.

export const ATTENDANCE_BASE_POINTS = 10;
export const POINTS_PER_KM = 2;

export const DIFFICULTY_BONUS: Record<Difficulty, number> = {
  [Difficulty.BEGINNER]: 0,
  [Difficulty.INTERMEDIATE]: 5,
  [Difficulty.ADVANCED]: 10,
  [Difficulty.ELITE]: 15,
};

/** Points granted for one confirmed attendance. */
export function computeAttendancePoints(input: {
  distanceKm?: number | null;
  difficulty?: Difficulty | string | null;
}): number {
  const distancePoints = Math.round((input.distanceKm ?? 0) * POINTS_PER_KM);
  const bonus = input.difficulty
    ? (DIFFICULTY_BONUS[input.difficulty as Difficulty] ?? 0)
    : 0;
  return ATTENDANCE_BASE_POINTS + distancePoints + bonus;
}

/** Minimum rank score required to hold each running level. */
export const RANK_THRESHOLDS: { level: RunningLevel; minScore: number }[] = [
  { level: RunningLevel.ADVANCED, minScore: 300 },
  { level: RunningLevel.INTERMEDIATE, minScore: 100 },
  { level: RunningLevel.BEGINNER, minScore: 0 },
];

/** Running level earned by a given rank score. */
export function levelForScore(score: number): RunningLevel {
  return RANK_THRESHOLDS.find((t) => score >= t.minScore)!.level;
}

/** Lowest rank score that still maps to the given running level. */
export function minScoreForLevel(level: RunningLevel | string): number {
  return RANK_THRESHOLDS.find((t) => t.level === level)?.minScore ?? 0;
}

export interface RankProgress {
  level: RunningLevel;
  nextLevel: RunningLevel | null;
  pointsToNextLevel: number;
  /** 0 → 1 progress towards the next level (1 when already at the top level). */
  progress: number;
}

export function rankProgress(score: number): RankProgress {
  const level = levelForScore(score);
  const ascending = [...RANK_THRESHOLDS].reverse();
  const currentIndex = ascending.findIndex((t) => t.level === level);
  const current = ascending[currentIndex];
  const next = ascending[currentIndex + 1] ?? null;

  if (!next) {
    return { level, nextLevel: null, pointsToNextLevel: 0, progress: 1 };
  }

  const span = next.minScore - current.minScore;
  return {
    level,
    nextLevel: next.level,
    pointsToNextLevel: next.minScore - score,
    progress: Math.min(1, Math.max(0, (score - current.minScore) / span)),
  };
}
