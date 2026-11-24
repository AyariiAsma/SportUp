import { z } from 'zod';
import { SportActivityType, ActivityVisibility, ActivityStatus } from '../types/enums';

// ─── Location Point ──────────────────────────────────────

export const locationPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  speed: z.number().nullable().optional(), // in m/s
  timestamp: z.number(), // epoch ms
  heartRate: z.number().int().min(30).max(250).nullable().optional(),
  cadence: z.number().int().min(0).max(300).nullable().optional(),
});

export type LocationPoint = z.infer<typeof locationPointSchema>;

// ─── Activity Split ──────────────────────────────────────

export const activitySplitSchema = z.object({
  km: z.number().int().min(1),
  timeSec: z.number().min(0),
  paceSec: z.number().min(0), // sec/km
  speedKmh: z.number().min(0).optional(),
  elevationGainM: z.number().optional().default(0),
  elevationLossM: z.number().optional().default(0),
  avgHeartRate: z.number().int().optional(),
  avgCadence: z.number().int().optional(),
});

export type ActivitySplit = z.infer<typeof activitySplitSchema>;

// ─── Sync Activity (Idempotent) ──────────────────────────

export const syncActivitySchema = z.object({
  clientSessionId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  sportType: z.nativeEnum(SportActivityType).default(SportActivityType.RUN),
  visibility: z.nativeEnum(ActivityVisibility).default(ActivityVisibility.PUBLIC),
  status: z.nativeEnum(ActivityStatus).default(ActivityStatus.COMPLETED),
  eventId: z.string().nullable().optional(),

  distanceKm: z.number().min(0),
  durationSec: z.number().int().min(0),
  movingDurationSec: z.number().int().min(0).optional(),
  avgPaceSec: z.number().min(0),
  avgSpeedKmh: z.number().min(0).optional(),
  maxSpeedKmh: z.number().min(0).optional(),

  elevationGainM: z.number().min(0).default(0),
  elevationLossM: z.number().min(0).default(0),
  calories: z.number().int().min(0).default(0),

  avgHeartRate: z.number().int().min(30).max(250).nullable().optional(),
  maxHeartRate: z.number().int().min(30).max(250).nullable().optional(),
  avgCadence: z.number().int().min(0).max(300).nullable().optional(),

  route: z.array(locationPointSchema),
  splits: z.array(activitySplitSchema),

  startTime: z.string(), // ISO string
  endTime: z.string(),   // ISO string
  isManual: z.boolean().default(false),
  sourceDevice: z.string().max(100).default('SportUp Mobile'),
  notes: z.string().max(2000).nullable().optional(),
});

export type SyncActivityInput = z.infer<typeof syncActivitySchema>;

// ─── Query Activities ────────────────────────────────────

export const activityQuerySchema = z.object({
  sportType: z.nativeEnum(SportActivityType).optional(),
  visibility: z.nativeEnum(ActivityVisibility).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;

// ─── GPX Import Schema ───────────────────────────────────

export const importGpxSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  sportType: z.nativeEnum(SportActivityType).default(SportActivityType.RUN),
  gpxXml: z.string().min(20, 'GPX data is too short or invalid'),
});

export type ImportGpxInput = z.infer<typeof importGpxSchema>;
