import { create } from 'zustand';
import * as Speech from 'expo-speech';
import {
  SportActivityType,
  LocationPoint,
  ActivitySplit,
  isValidGpsPoint,
  haversineDistance,
  smoothCoordinate,
  calculateElevationGainLoss,
  calculateCalories,
} from '@sportup/shared';
import { activityService } from '../services/activity.service';

export type TrackingStatus = 'IDLE' | 'TRACKING' | 'PAUSED' | 'AUTO_PAUSED' | 'FINISHED';
export type GpsSignalQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'NONE';

interface TrackingState {
  trackingStatus: TrackingStatus;
  sportType: SportActivityType;
  clientSessionId: string;
  eventId: string | null;
  eventTitle: string | null;

  startTime: string;
  distanceKm: number;
  durationSec: number;
  movingDurationSec: number;

  currentPaceSec: number;
  avgPaceSec: number;
  currentSpeedKmh: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;

  elevationGainM: number;
  elevationLossM: number;
  calories: number;

  route: LocationPoint[];
  splits: ActivitySplit[];

  gpsAccuracy: number | null;
  gpsSignalQuality: GpsSignalQuality;

  crashedSession: any | null;

  // Actions
  setSportType: (sport: SportActivityType) => void;
  startTracking: (eventId?: string, eventTitle?: string) => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
  stopTracking: () => void;
  discardTracking: () => void;
  processLocationPoint: (location: {
    coords: {
      latitude: number;
      longitude: number;
      altitude?: number | null;
      accuracy?: number | null;
      speed?: number | null;
    };
    timestamp: number;
  }) => void;
  tickTimer: () => void;
  checkForCrashedSession: () => Promise<void>;
  restoreCrashedSession: () => void;
  dismissCrashedSession: () => void;
}

// Helpers
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function computeGpsQuality(accuracy: number | null | undefined): GpsSignalQuality {
  if (accuracy == null) return 'NONE';
  if (accuracy <= 8) return 'EXCELLENT';
  if (accuracy <= 15) return 'GOOD';
  if (accuracy <= 25) return 'FAIR';
  return 'POOR';
}

let stationaryCounter = 0;
let lastPersistTimestamp = 0;

export const useTrackingStore = create<TrackingState>((set, get) => ({
  trackingStatus: 'IDLE',
  sportType: SportActivityType.RUN,
  clientSessionId: generateUUID(),
  eventId: null,
  eventTitle: null,

  startTime: new Date().toISOString(),
  distanceKm: 0,
  durationSec: 0,
  movingDurationSec: 0,

  currentPaceSec: 0,
  avgPaceSec: 0,
  currentSpeedKmh: 0,
  avgSpeedKmh: 0,
  maxSpeedKmh: 0,

  elevationGainM: 0,
  elevationLossM: 0,
  calories: 0,

  route: [],
  splits: [],

  gpsAccuracy: null,
  gpsSignalQuality: 'NONE',
  crashedSession: null,

  setSportType: (sport) => {
    if (get().trackingStatus === 'IDLE') {
      set({ sportType: sport });
    }
  },

  startTracking: (eventId, eventTitle) => {
    stationaryCounter = 0;
    const nowIso = new Date().toISOString();
    const newSessionId = generateUUID();

    set({
      trackingStatus: 'TRACKING',
      clientSessionId: newSessionId,
      eventId: eventId || null,
      eventTitle: eventTitle || null,
      startTime: nowIso,
      distanceKm: 0,
      durationSec: 0,
      movingDurationSec: 0,
      currentPaceSec: 0,
      avgPaceSec: 0,
      currentSpeedKmh: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      calories: 0,
      route: [],
      splits: [],
    });

    try {
      Speech.speak('Workout started. Enjoy your session!');
    } catch {
      // safe fallback
    }
  },

  pauseTracking: () => {
    if (get().trackingStatus === 'TRACKING' || get().trackingStatus === 'AUTO_PAUSED') {
      set({ trackingStatus: 'PAUSED', currentPaceSec: 0, currentSpeedKmh: 0 });
      try {
        Speech.speak('Workout paused.');
      } catch {}
    }
  },

  resumeTracking: () => {
    if (get().trackingStatus === 'PAUSED' || get().trackingStatus === 'AUTO_PAUSED') {
      stationaryCounter = 0;
      set({ trackingStatus: 'TRACKING' });
      try {
        Speech.speak('Workout resumed.');
      } catch {}
    }
  },

  stopTracking: () => {
    set({ trackingStatus: 'FINISHED' });
    activityService.clearActiveSessionSnapshot();
    try {
      Speech.speak('Workout complete. Great effort!');
    } catch {}
  },

  discardTracking: () => {
    set({
      trackingStatus: 'IDLE',
      distanceKm: 0,
      durationSec: 0,
      movingDurationSec: 0,
      route: [],
      splits: [],
      crashedSession: null,
    });
    activityService.clearActiveSessionSnapshot();
  },

  tickTimer: () => {
    const { trackingStatus, durationSec, movingDurationSec, distanceKm, sportType } = get();
    if (trackingStatus === 'IDLE' || trackingStatus === 'FINISHED') return;

    const nextDuration = durationSec + 1;
    let nextMoving = movingDurationSec;

    if (trackingStatus === 'TRACKING') {
      nextMoving += 1;
    }

    const avgPaceSec = distanceKm > 0.05 && nextMoving > 0 ? nextMoving / distanceKm : 0;
    const avgSpeedKmh = nextMoving > 0 ? (distanceKm / (nextMoving / 3600)) : 0;
    const calories = calculateCalories({
      sportType,
      durationSec: nextDuration,
      distanceKm,
    });

    set({
      durationSec: nextDuration,
      movingDurationSec: nextMoving,
      avgPaceSec,
      avgSpeedKmh,
      calories,
    });

    // Crash recovery auto-save every 5 seconds while active
    const now = Date.now();
    if (now - lastPersistTimestamp > 5000) {
      lastPersistTimestamp = now;
      const state = get();
      activityService.saveActiveSessionSnapshot({
        clientSessionId: state.clientSessionId,
        sportType: state.sportType,
        eventId: state.eventId,
        eventTitle: state.eventTitle,
        startTime: state.startTime,
        distanceKm: state.distanceKm,
        durationSec: nextDuration,
        movingDurationSec: nextMoving,
        avgPaceSec,
        avgSpeedKmh,
        maxSpeedKmh: state.maxSpeedKmh,
        elevationGainM: state.elevationGainM,
        elevationLossM: state.elevationLossM,
        calories,
        route: state.route,
        splits: state.splits,
      });
    }
  },

  processLocationPoint: (location) => {
    const { trackingStatus, route, distanceKm, movingDurationSec, sportType, splits, maxSpeedKmh } = get();
    if (trackingStatus === 'IDLE' || trackingStatus === 'PAUSED' || trackingStatus === 'FINISHED') return;

    const accuracy = location.coords.accuracy ?? null;
    set({
      gpsAccuracy: accuracy,
      gpsSignalQuality: computeGpsQuality(accuracy),
    });

    const lastPoint = route.length > 0 ? route[route.length - 1] : null;

    const rawPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude ?? null,
      accuracy,
      speed: location.coords.speed ?? null,
      timestamp: location.timestamp,
    };

    // 1. Noise and Anomaly Filter
    const maxAllowableSpeed = sportType === SportActivityType.RIDE ? 35 : 13; // m/s
    if (!isValidGpsPoint(rawPoint, lastPoint, { maxAccuracyM: 25, minMovementM: 2, maxSpeedMs: maxAllowableSpeed })) {
      return;
    }

    // 2. Kalman / Moving-Average Coordinate Smoothing
    const smoothedLat = lastPoint ? smoothCoordinate(lastPoint.latitude, rawPoint.latitude, accuracy || 10) : rawPoint.latitude;
    const smoothedLon = lastPoint ? smoothCoordinate(lastPoint.longitude, rawPoint.longitude, accuracy || 10) : rawPoint.longitude;

    const newPoint: LocationPoint = {
      ...rawPoint,
      latitude: smoothedLat,
      longitude: smoothedLon,
    };

    if (!lastPoint) {
      set({ route: [newPoint] });
      return;
    }

    const deltaMeters = haversineDistance(lastPoint.latitude, lastPoint.longitude, newPoint.latitude, newPoint.longitude);
    const dtSec = Math.max(0.5, (newPoint.timestamp - lastPoint.timestamp) / 1000);
    const instantaneousSpeedMs = deltaMeters / dtSec;
    const instantaneousSpeedKmh = instantaneousSpeedMs * 3.6;

    // 3. Auto-Pause Detection
    const pauseThresholdSpeedMs = sportType === SportActivityType.RIDE ? 1.2 : 0.8;
    if (instantaneousSpeedMs < pauseThresholdSpeedMs) {
      stationaryCounter++;
      if (stationaryCounter >= 3 && trackingStatus === 'TRACKING') {
        set({ trackingStatus: 'AUTO_PAUSED', currentPaceSec: 0, currentSpeedKmh: 0 });
        try {
          Speech.speak('Auto paused');
        } catch {}
        return;
      }
    } else {
      if (trackingStatus === 'AUTO_PAUSED') {
        set({ trackingStatus: 'TRACKING' });
        try {
          Speech.speak('Resuming');
        } catch {}
      }
      stationaryCounter = 0;
    }

    const newTotalDistanceKm = distanceKm + deltaMeters / 1000;
    const updatedRoute = [...route, newPoint];

    // 4. Elevation Gain / Loss
    const altitudes = updatedRoute.map((p) => p.altitude);
    const { gainM, lossM } = calculateElevationGainLoss(altitudes, 2.5);

    // 5. Current Pace & Speed
    const paceForSegment = deltaMeters > 0 ? dtSec / (deltaMeters / 1000) : 0;
    const newMaxSpeed = Math.max(maxSpeedKmh, instantaneousSpeedKmh);

    // 6. Split Computation (per 1 km)
    const completedKms = Math.floor(newTotalDistanceKm);
    const prevSplitsCount = splits.length;

    let updatedSplits = splits;
    if (completedKms > prevSplitsCount) {
      const splitKm = completedKms;
      const prevSplitsTime = splits.reduce((acc, s) => acc + s.timeSec, 0);
      const splitTimeSec = Math.max(1, Math.round(movingDurationSec - prevSplitsTime));

      const newSplit: ActivitySplit = {
        km: splitKm,
        timeSec: splitTimeSec,
        paceSec: splitTimeSec,
        speedKmh: parseFloat((3600 / splitTimeSec).toFixed(1)),
        elevationGainM: gainM,
        elevationLossM: lossM,
      };

      updatedSplits = [...splits, newSplit];

      // Audio split announcement
      const mins = Math.floor(splitTimeSec / 60);
      const secs = Math.floor(splitTimeSec % 60);
      const unit = sportType === SportActivityType.RIDE ? 'speed' : 'pace';
      const announcement = sportType === SportActivityType.RIDE
        ? `Kilometer ${splitKm} completed. Speed ${newSplit.speedKmh} kilometers per hour.`
        : `Kilometer ${splitKm} completed. Pace ${mins} minutes ${secs} seconds.`;

      try {
        Speech.speak(announcement);
      } catch {}
    }

    set({
      route: updatedRoute,
      distanceKm: newTotalDistanceKm,
      currentPaceSec: paceForSegment,
      currentSpeedKmh: instantaneousSpeedKmh,
      maxSpeedKmh: newMaxSpeed,
      elevationGainM: gainM,
      elevationLossM: lossM,
      splits: updatedSplits,
    });
  },

  checkForCrashedSession: async () => {
    const snapshot = await activityService.getActiveSessionSnapshot();
    if (snapshot && snapshot.distanceKm > 0.05 && snapshot.route && snapshot.route.length > 2) {
      set({ crashedSession: snapshot });
    }
  },

  restoreCrashedSession: () => {
    const { crashedSession } = get();
    if (!crashedSession) return;

    set({
      trackingStatus: 'PAUSED',
      clientSessionId: crashedSession.clientSessionId || generateUUID(),
      sportType: crashedSession.sportType || SportActivityType.RUN,
      eventId: crashedSession.eventId,
      eventTitle: crashedSession.eventTitle,
      startTime: crashedSession.startTime,
      distanceKm: crashedSession.distanceKm,
      durationSec: crashedSession.durationSec,
      movingDurationSec: crashedSession.movingDurationSec,
      avgPaceSec: crashedSession.avgPaceSec,
      avgSpeedKmh: crashedSession.avgSpeedKmh,
      maxSpeedKmh: crashedSession.maxSpeedKmh,
      elevationGainM: crashedSession.elevationGainM,
      elevationLossM: crashedSession.elevationLossM,
      calories: crashedSession.calories,
      route: crashedSession.route || [],
      splits: crashedSession.splits || [],
      crashedSession: null,
    });
  },

  dismissCrashedSession: () => {
    set({ crashedSession: null });
    activityService.clearActiveSessionSnapshot();
  },
}));
