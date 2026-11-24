import { z } from 'zod';

export const createPrivacyZoneSchema = z.object({
  name: z.string().min(1).max(50).default('Home'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(50).max(2000).default(500),
});

export type CreatePrivacyZoneInput = z.infer<typeof createPrivacyZoneSchema>;

export const updatePrivacyZoneSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  radiusMeters: z.number().min(50).max(2000).optional(),
});

export type UpdatePrivacyZoneInput = z.infer<typeof updatePrivacyZoneSchema>;
