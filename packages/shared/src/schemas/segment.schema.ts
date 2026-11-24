import { z } from 'zod';
import { SportActivityType } from '../types/enums';
import { locationPointSchema } from './activity.schema';

export const createSegmentSchema = z.object({
  name: z.string().min(3, 'Segment name must be at least 3 characters').max(100),
  sportType: z.nativeEnum(SportActivityType).default(SportActivityType.RUN),
  distanceM: z.number().min(50, 'Segment must be at least 50 meters long'),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  polyline: z.array(locationPointSchema).min(2),
  elevationGainM: z.number().default(0),
});

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;

export const segmentQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).default(25),
  sportType: z.nativeEnum(SportActivityType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SegmentQueryInput = z.infer<typeof segmentQuerySchema>;
