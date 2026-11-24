import { LocationPoint } from '../schemas/activity.schema';
import { PRType, SportActivityType } from '../types/enums';
import { haversineDistance } from './activityMath';

export interface SegmentMatchResult {
  matched: boolean;
  elapsedTimeSec: number;
  movingTimeSec: number;
  avgSpeedKmh: number;
  avgPaceSec: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Checks if a GPS route traverses a given segment (within 25m threshold of start and finish).
 */
export function matchSegment(
  route: LocationPoint[],
  segment: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    distanceM: number;
  },
  thresholdM = 25
): SegmentMatchResult | null {
  if (route.length < 2) return null;

  let bestStartIdx = -1;
  let minStartDist = thresholdM;

  for (let i = 0; i < route.length - 1; i++) {
    const d = haversineDistance(route[i].latitude, route[i].longitude, segment.startLat, segment.startLng);
    if (d <= minStartDist) {
      minStartDist = d;
      bestStartIdx = i;
    }
  }

  if (bestStartIdx === -1) return null;

  let bestEndIdx = -1;
  let minEndDist = thresholdM;

  for (let i = bestStartIdx + 1; i < route.length; i++) {
    const d = haversineDistance(route[i].latitude, route[i].longitude, segment.endLat, segment.endLng);
    if (d <= minEndDist) {
      minEndDist = d;
      bestEndIdx = i;
    }
  }

  if (bestEndIdx === -1) return null;

  const startPt = route[bestStartIdx];
  const endPt = route[bestEndIdx];

  const elapsedTimeSec = Math.max(1, Math.round((endPt.timestamp - startPt.timestamp) / 1000));
  const segmentDistKm = segment.distanceM / 1000;
  const avgSpeedKmh = parseFloat(((segmentDistKm / (elapsedTimeSec / 3600))).toFixed(2));
  const avgPaceSec = Math.round(elapsedTimeSec / segmentDistKm);

  return {
    matched: true,
    elapsedTimeSec,
    movingTimeSec: elapsedTimeSec,
    avgSpeedKmh,
    avgPaceSec,
    startIndex: bestStartIdx,
    endIndex: bestEndIdx,
  };
}

/**
 * Detects newly achieved personal records on a finished activity.
 */
export function detectPersonalRecords(
  activity: {
    distanceKm: number;
    durationSec: number;
    avgPaceSec: number;
    splits: Array<{ km: number; timeSec: number; paceSec?: number }>;
    sportType: SportActivityType;
  },
  existingPRs: Partial<Record<PRType, number>>
): Array<{ type: PRType; value: number }> {
  const newPRs: Array<{ type: PRType; value: number }> = [];

  // 1. Longest Distance
  if (
    activity.distanceKm > 0.5 &&
    (!existingPRs.LONGEST_DISTANCE || activity.distanceKm > existingPRs.LONGEST_DISTANCE)
  ) {
    newPRs.push({ type: PRType.LONGEST_DISTANCE, value: activity.distanceKm });
  }

  // 2. Fastest Overall Pace (for runs > 1km)
  if (
    activity.distanceKm >= 1.0 &&
    activity.avgPaceSec > 0 &&
    (!existingPRs.FASTEST_PACE || activity.avgPaceSec < existingPRs.FASTEST_PACE)
  ) {
    newPRs.push({ type: PRType.FASTEST_PACE, value: activity.avgPaceSec });
  }

  // 3. Best 1K Split
  if (activity.splits && activity.splits.length > 0) {
    const fastestSplitSec = Math.min(...activity.splits.map((s) => s.timeSec));
    if (
      fastestSplitSec > 0 &&
      (!existingPRs.BEST_1K || fastestSplitSec < existingPRs.BEST_1K)
    ) {
      newPRs.push({ type: PRType.BEST_1K, value: fastestSplitSec });
    }
  }

  // 4. Best 5K
  if (activity.distanceKm >= 5.0 && activity.splits.length >= 5) {
    let best5kSec = Infinity;
    for (let i = 0; i <= activity.splits.length - 5; i++) {
      const window5k = activity.splits.slice(i, i + 5).reduce((acc, s) => acc + s.timeSec, 0);
      if (window5k < best5kSec) best5kSec = window5k;
    }
    if (best5kSec < Infinity && (!existingPRs.BEST_5K || best5kSec < existingPRs.BEST_5K)) {
      newPRs.push({ type: PRType.BEST_5K, value: best5kSec });
    }
  }

  // 5. Best 10K
  if (activity.distanceKm >= 10.0 && activity.splits.length >= 10) {
    let best10kSec = Infinity;
    for (let i = 0; i <= activity.splits.length - 10; i++) {
      const window10k = activity.splits.slice(i, i + 10).reduce((acc, s) => acc + s.timeSec, 0);
      if (window10k < best10kSec) best10kSec = window10k;
    }
    if (best10kSec < Infinity && (!existingPRs.BEST_10K || best10kSec < existingPRs.BEST_10K)) {
      newPRs.push({ type: PRType.BEST_10K, value: best10kSec });
    }
  }

  // 6. Half Marathon (~21.1 km)
  if (activity.distanceKm >= 21.0975) {
    if (!existingPRs.HALF_MARATHON || activity.durationSec < existingPRs.HALF_MARATHON) {
      newPRs.push({ type: PRType.HALF_MARATHON, value: activity.durationSec });
    }
  }

  // 7. Marathon (~42.2 km)
  if (activity.distanceKm >= 42.195) {
    if (!existingPRs.MARATHON || activity.durationSec < existingPRs.MARATHON) {
      newPRs.push({ type: PRType.MARATHON, value: activity.durationSec });
    }
  }

  return newPRs;
}

/**
 * Computes weekly relative training load / fitness score.
 */
export function calculateWeeklyTrainingLoad(
  activities: Array<{ durationSec: number; distanceKm: number }>
): {
  score: number;
  level: 'RECOVERY' | 'MAINTENANCE' | 'OPTIMAL' | 'OVERREACHING';
  totalDurationMin: number;
  totalDistanceKm: number;
} {
  let totalDurationMin = 0;
  let totalDistanceKm = 0;

  for (const act of activities) {
    totalDurationMin += act.durationSec / 60;
    totalDistanceKm += act.distanceKm;
  }

  // Relative effort: 1 minute of activity = ~1 load point, distance weight = 2 pts/km
  const score = Math.round(totalDurationMin * 0.7 + totalDistanceKm * 2.5);

  let level: 'RECOVERY' | 'MAINTENANCE' | 'OPTIMAL' | 'OVERREACHING' = 'OPTIMAL';
  if (score < 40) level = 'RECOVERY';
  else if (score < 100) level = 'MAINTENANCE';
  else if (score <= 250) level = 'OPTIMAL';
  else level = 'OVERREACHING';

  return {
    score,
    level,
    totalDurationMin: Math.round(totalDurationMin),
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(1)),
  };
}
