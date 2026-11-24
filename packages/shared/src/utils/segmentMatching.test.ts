import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchSegment,
  detectPersonalRecords,
  calculateWeeklyTrainingLoad,
} from './segmentMatching';
import { PRType, SportActivityType } from '../types/enums';

describe('Segment Matching & PR Analytics', () => {
  it('accurately matches a route that crosses start and finish points of a segment', () => {
    // 500m segment along Habib Bourguiba
    const segment = {
      startLat: 36.8000,
      startLng: 10.1800,
      endLat: 36.8045,
      endLng: 10.1800,
      distanceM: 500,
    };

    const route = [
      { latitude: 36.7990, longitude: 10.1800, timestamp: 1000 },
      { latitude: 36.80005, longitude: 10.18005, timestamp: 3000 }, // start match
      { latitude: 36.8020, longitude: 10.1800, timestamp: 60000 },
      { latitude: 36.80455, longitude: 10.18005, timestamp: 120000 }, // finish match (117 sec later)
      { latitude: 36.8060, longitude: 10.1800, timestamp: 150000 },
    ];

    const match = matchSegment(route, segment, 25);
    assert.ok(match, 'Expected match to be found');
    assert.equal(match.matched, true);
    assert.equal(match.elapsedTimeSec, 117);
    assert.ok(match.avgSpeedKmh > 10, 'Expected speed > 10 km/h');
  });

  it('rejects a route that does not reach the finish point of a segment', () => {
    const segment = {
      startLat: 36.8000,
      startLng: 10.1800,
      endLat: 36.8200,
      endLng: 10.1800,
      distanceM: 2200,
    };

    const route = [
      { latitude: 36.8000, longitude: 10.1800, timestamp: 1000 },
      { latitude: 36.8050, longitude: 10.1800, timestamp: 50000 }, // stops far from finish
    ];

    const match = matchSegment(route, segment, 25);
    assert.equal(match, null);
  });

  it('automatically detects new personal records for distance, pace, and splits', () => {
    const activity = {
      distanceKm: 6.2,
      durationSec: 1800,
      avgPaceSec: 290,
      sportType: SportActivityType.RUN,
      splits: [
        { km: 1, timeSec: 295, paceSec: 295 },
        { km: 2, timeSec: 280, paceSec: 280 }, // fastest 1K
        { km: 3, timeSec: 290, paceSec: 290 },
        { km: 4, timeSec: 285, paceSec: 285 },
        { km: 5, timeSec: 290, paceSec: 290 },
        { km: 6, timeSec: 300, paceSec: 300 },
      ],
    };

    const existingPRs = {
      [PRType.LONGEST_DISTANCE]: 5.0,
      [PRType.BEST_1K]: 310,
    };

    const newPRs = detectPersonalRecords(activity, existingPRs);
    const types = newPRs.map((p) => p.type);

    assert.ok(types.includes(PRType.LONGEST_DISTANCE));
    assert.ok(types.includes(PRType.BEST_1K));
    assert.ok(types.includes(PRType.BEST_5K));
    assert.ok(types.includes(PRType.FASTEST_PACE));
  });

  it('calculates weekly relative training load accurately', () => {
    const weeklyWorkouts = [
      { durationSec: 3600, distanceKm: 10 },
      { durationSec: 2400, distanceKm: 6 },
      { durationSec: 4800, distanceKm: 14 },
    ];

    const load = calculateWeeklyTrainingLoad(weeklyWorkouts);
    assert.ok(load.score > 100, `Expected score > 100, got ${load.score}`);
    assert.equal(load.level, 'OPTIMAL');
    assert.equal(load.totalDistanceKm, 30);
  });
});
