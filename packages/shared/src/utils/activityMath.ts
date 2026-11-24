import { LocationPoint } from '../schemas/activity.schema';
import { SportActivityType } from '../types/enums';

/**
 * Calculates geodesic distance between two points in meters using Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface GpsFilterOptions {
  maxAccuracyM?: number;       // Drop points with accuracy worse than this (default: 25m)
  minMovementM?: number;       // Minimum delta meters to count as real movement (default: 2m)
  maxSpeedMs?: number;         // Max speed threshold: 12.5 m/s (~45 km/h for run), 33.3 m/s (~120 km/h for ride)
}

/**
 * Validates whether a new incoming GPS point should be accepted or rejected as jitter/anomaly.
 */
export function isValidGpsPoint(
  newPoint: LocationPoint,
  lastPoint: LocationPoint | null,
  options: GpsFilterOptions = {}
): boolean {
  const maxAccuracy = options.maxAccuracyM ?? 25;
  const minMovement = options.minMovementM ?? 2;
  const maxSpeed = options.maxSpeedMs ?? 15; // default ~54 km/h

  // 1. Accuracy gate: reject if GPS signal is too imprecise
  if (newPoint.accuracy != null && newPoint.accuracy > maxAccuracy) {
    return false;
  }

  if (!lastPoint) {
    return true; // first point accepted if accuracy is acceptable
  }

  const dtSec = Math.max(0.1, (newPoint.timestamp - lastPoint.timestamp) / 1000);
  const distM = haversineDistance(
    lastPoint.latitude,
    lastPoint.longitude,
    newPoint.latitude,
    newPoint.longitude
  );

  // 2. Reject zero or backwards timestamp
  if (newPoint.timestamp <= lastPoint.timestamp) {
    return false;
  }

  // 3. Reject tiny stationary jitters
  if (distM < minMovement) {
    return false;
  }

  // 4. Reject unrealistic speed jumps (e.g. teleportation)
  const impliedSpeedMs = distM / dtSec;
  if (impliedSpeedMs > maxSpeed) {
    return false;
  }

  return true;
}

/**
 * 1D Kalman-like smooth estimate for coordinate tracking.
 */
export function smoothCoordinate(
  prevCoord: number,
  newCoord: number,
  accuracy: number = 10
): number {
  // Higher accuracy number means higher uncertainty (less weight to new coordinate)
  const weight = Math.max(0.2, Math.min(0.8, 15 / (accuracy + 10)));
  return prevCoord + weight * (newCoord - prevCoord);
}

/**
 * Computes elevation gain and loss from an altitude array using a hysteresis threshold
 * to eliminate sensor noise / oscillation.
 */
export function calculateElevationGainLoss(
  altitudes: (number | null | undefined)[],
  thresholdM: number = 2.5
): { gainM: number; lossM: number } {
  let gainM = 0;
  let lossM = 0;
  let lastValidAlt: number | null = null;
  let accumulatedDiff = 0;

  for (const alt of altitudes) {
    if (alt == null || isNaN(alt)) continue;

    if (lastValidAlt == null) {
      lastValidAlt = alt;
      continue;
    }

    const diff = alt - lastValidAlt;
    accumulatedDiff += diff;

    if (accumulatedDiff >= thresholdM) {
      gainM += accumulatedDiff;
      accumulatedDiff = 0;
      lastValidAlt = alt;
    } else if (accumulatedDiff <= -thresholdM) {
      lossM += Math.abs(accumulatedDiff);
      accumulatedDiff = 0;
      lastValidAlt = alt;
    }
  }

  return {
    gainM: Math.round(gainM),
    lossM: Math.round(lossM),
  };
}

/**
 * Estimates energy expenditure (calories burned) using ACSM Metabolic Equations (METs).
 */
export function calculateCalories(params: {
  sportType: SportActivityType;
  durationSec: number;
  distanceKm: number;
  weightKg?: number;
}): number {
  const { sportType, durationSec, distanceKm, weightKg = 70 } = params;
  if (durationSec <= 0) return 0;

  const durationHours = durationSec / 3600;
  const speedKmh = durationHours > 0 ? distanceKm / durationHours : 0;

  let met = 7.0; // default moderate running

  switch (sportType) {
    case SportActivityType.RUN:
    case SportActivityType.TRAIL_RUN:
      if (speedKmh <= 8) met = 8.3;        // ~7:30 min/km
      else if (speedKmh <= 10) met = 9.8;   // ~6:00 min/km
      else if (speedKmh <= 12) met = 11.5;  // ~5:00 min/km
      else if (speedKmh <= 14) met = 12.8;  // ~4:15 min/km
      else met = 14.5;                      // faster than 4:15 min/km
      break;

    case SportActivityType.RIDE:
      if (speedKmh <= 15) met = 4.0;
      else if (speedKmh <= 20) met = 6.8;
      else if (speedKmh <= 25) met = 8.5;
      else if (speedKmh <= 30) met = 10.0;
      else met = 12.0;
      break;

    case SportActivityType.WALK:
      met = speedKmh > 5.5 ? 4.3 : 3.5;
      break;

    case SportActivityType.HIKE:
      met = 6.0;
      break;

    case SportActivityType.SWIM:
      met = 8.0;
      break;

    case SportActivityType.YOGA:
      met = 3.0;
      break;

    default:
      met = 6.0;
  }

  // Calories = MET * weight (kg) * duration (hours)
  const calories = met * weightKg * durationHours;
  return Math.round(calories);
}

/**
 * Formats pace in mm:ss /km
 */
export function formatPace(paceSec: number): string {
  if (!paceSec || paceSec <= 0 || !isFinite(paceSec)) return '--:--';
  if (paceSec > 3600) return '>60:00';
  const min = Math.floor(paceSec / 60);
  const sec = Math.floor(paceSec % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Formats speed in km/h
 */
export function formatSpeed(speedKmh: number): string {
  if (!speedKmh || speedKmh <= 0 || !isFinite(speedKmh)) return '0.0';
  return speedKmh.toFixed(1);
}

/**
 * Builds an RFC-compliant GPX XML file string from an activity.
 */
export function exportToGpx(activity: {
  title: string;
  sportType: string;
  startTime: string;
  route: LocationPoint[];
}): string {
  const { title, sportType, startTime, route } = activity;
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const trackPointsXml = route
    .map((pt) => {
      const timeIso = new Date(pt.timestamp).toISOString();
      const eleXml = pt.altitude != null ? `\n        <ele>${pt.altitude.toFixed(1)}</ele>` : '';
      return `      <trkpt lat="${pt.latitude.toFixed(6)}" lon="${pt.longitude.toFixed(6)}">${eleXml}
        <time>${timeIso}</time>
      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SportUp - https://sportup.app" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapedTitle}</name>
    <time>${startTime}</time>
  </metadata>
  <trk>
    <name>${escapedTitle}</name>
    <type>${sportType}</type>
    <trkseg>
${trackPointsXml}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Lightweight GPX parser extracting coordinates, elevation, timestamps, and computing distance.
 */
export function parseGpx(gpxString: string): {
  points: LocationPoint[];
  distanceKm: number;
  durationSec: number;
  startTime: string;
  endTime: string;
} {
  const points: LocationPoint[] = [];
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let match: RegExpExecArray | null;

  while ((match = trkptRegex.exec(gpxString)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const body = match[3];

    const eleMatch = /<ele>([^<]+)<\/ele>/.exec(body);
    const timeMatch = /<time>([^<]+)<\/time>/.exec(body);

    const altitude = eleMatch ? parseFloat(eleMatch[1]) : undefined;
    const timestamp = timeMatch ? new Date(timeMatch[1]).getTime() : Date.now();

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({
        latitude: lat,
        longitude: lon,
        altitude,
        timestamp,
      });
    }
  }

  let totalDistM = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistM += haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude
    );
  }

  const startTime = points.length > 0 ? new Date(points[0].timestamp).toISOString() : new Date().toISOString();
  const endTime = points.length > 0 ? new Date(points[points.length - 1].timestamp).toISOString() : startTime;
  const durationSec = points.length > 1 ? Math.max(0, Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000)) : 0;

  return {
    points,
    distanceKm: parseFloat((totalDistM / 1000).toFixed(2)),
    durationSec,
    startTime,
    endTime,
  };
}
