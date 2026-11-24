import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  isValidGpsPoint,
  calculateElevationGainLoss,
  calculateCalories,
  formatPace,
  formatSpeed,
  exportToGpx,
  parseGpx,
} from './activityMath';
import { SportActivityType } from '../types/enums';

describe('Activity Math & GPS Filtering Utilities', () => {
  it('accurately calculates haversine distance between two points', () => {
    // Habib Bourguiba Avenue, Tunis to Carthage (~14.5 km)
    const distM = haversineDistance(36.8008, 10.1865, 36.8528, 10.3233);
    assert.ok(distM > 13000 && distM < 16000, `Expected ~14.5km, got ${distM}m`);
  });

  it('rejects GPS points with poor accuracy (> 25m)', () => {
    const point = {
      latitude: 36.8008,
      longitude: 10.1865,
      accuracy: 35, // poor accuracy
      timestamp: 1000,
    };
    assert.equal(isValidGpsPoint(point, null), false);
  });

  it('rejects points with unrealistically high speed jumps (outlier rejection)', () => {
    const pt1 = {
      latitude: 36.8000,
      longitude: 10.1800,
      accuracy: 5,
      timestamp: 1000,
    };
    const pt2 = {
      latitude: 36.8100, // ~1.1 km away
      longitude: 10.1800,
      accuracy: 5,
      timestamp: 2000, // only 1 second later! (> 3000 km/h)
    };
    assert.equal(isValidGpsPoint(pt2, pt1, { maxSpeedMs: 12 }), false);
  });

  it('accepts valid progressive movement within speed constraints', () => {
    const pt1 = {
      latitude: 36.80000,
      longitude: 10.18000,
      accuracy: 5,
      timestamp: 1000,
    };
    const pt2 = {
      latitude: 36.80010, // ~11 meters away
      longitude: 10.18000,
      accuracy: 5,
      timestamp: 4000, // 3 seconds later (~3.7 m/s, realistic run)
    };
    assert.equal(isValidGpsPoint(pt2, pt1, { minMovementM: 2, maxSpeedMs: 12 }), true);
  });

  it('calculates elevation gain and loss ignoring micro-fluctuations', () => {
    // Alts: 100 -> 101 -> 100.5 -> 105 -> 104 -> 102
    const alts = [100, 101, 100.5, 104, 106, 105, 101];
    const { gainM, lossM } = calculateElevationGainLoss(alts, 2.5);
    assert.ok(gainM >= 5, `Expected gain >= 5m, got ${gainM}`);
    assert.ok(lossM >= 4, `Expected loss >= 4m, got ${lossM}`);
  });

  it('calculates realistic calories based on sport MET values', () => {
    // 10km run in 50 minutes (3000 sec) for 70kg runner
    const calRun = calculateCalories({
      sportType: SportActivityType.RUN,
      distanceKm: 10,
      durationSec: 3000,
      weightKg: 70,
    });
    // MET for 12 km/h is ~11.5 * 70 * 0.833h = ~670 kcal
    assert.ok(calRun > 600 && calRun < 750, `Expected ~670 kcal, got ${calRun}`);

    // 20km ride in 1 hour (3600 sec) for 70kg cyclist
    const calRide = calculateCalories({
      sportType: SportActivityType.RIDE,
      distanceKm: 20,
      durationSec: 3600,
      weightKg: 70,
    });
    // MET ~6.8 * 70 * 1h = ~476 kcal
    assert.ok(calRide > 400 && calRide < 550, `Expected ~476 kcal, got ${calRide}`);
  });

  it('formats pace and speed strings properly', () => {
    assert.equal(formatPace(300), '5:00'); // 300s = 5 min/km
    assert.equal(formatPace(325), '5:25');
    assert.equal(formatPace(0), '--:--');
    assert.equal(formatSpeed(24.56), '24.6');
  });

  it('generates valid GPX XML and accurately parses it back', () => {
    const route = [
      { latitude: 36.8000, longitude: 10.1800, altitude: 20, timestamp: 1700000000000 },
      { latitude: 36.8010, longitude: 10.1810, altitude: 25, timestamp: 1700000060000 },
      { latitude: 36.8020, longitude: 10.1820, altitude: 30, timestamp: 1700000120000 },
    ];

    const gpxXml = exportToGpx({
      title: 'Morning Trail Run',
      sportType: 'TRAIL_RUN',
      startTime: new Date(1700000000000).toISOString(),
      route,
    });

    assert.ok(gpxXml.includes('<name>Morning Trail Run</name>'));
    assert.ok(gpxXml.includes('<trkpt lat="36.800000" lon="10.180000">'));

    const parsed = parseGpx(gpxXml);
    assert.equal(parsed.points.length, 3);
    assert.ok(parsed.distanceKm > 0.25, `Expected distance > 250m, got ${parsed.distanceKm}km`);
    assert.equal(parsed.durationSec, 120);
  });
});
