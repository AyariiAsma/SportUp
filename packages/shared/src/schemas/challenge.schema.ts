import { z } from 'zod';
import { ChallengeType, SportActivityType } from '../types/enums';

export const createChallengeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(1000),
  badgeKey: z.string().optional(),
  badgeIconUrl: z.string().url().optional(),
  type: z.nativeEnum(ChallengeType).default(ChallengeType.MONTHLY_DISTANCE),
  targetValue: z.number().positive('Target must be positive'),
  sportType: z.nativeEnum(SportActivityType).default(SportActivityType.RUN),
  startDate: z.string(),
  endDate: z.string(),
  clubId: z.string().optional(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export const challengeQuerySchema = z.object({
  status: z.enum(['active', 'upcoming', 'completed']).default('active'),
  clubId: z.string().optional(),
  sportType: z.nativeEnum(SportActivityType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ChallengeQueryInput = z.input<typeof challengeQuerySchema>;
