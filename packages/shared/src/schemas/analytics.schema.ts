import { z } from 'zod';
import { SportActivityType, GoalPeriod, GoalTargetType, PRType } from '../types/enums';

export const createGoalSchema = z.object({
  sportType: z.nativeEnum(SportActivityType).default(SportActivityType.RUN),
  period: z.nativeEnum(GoalPeriod).default(GoalPeriod.WEEKLY),
  targetType: z.nativeEnum(GoalTargetType).default(GoalTargetType.DISTANCE_KM),
  targetValue: z.number().positive('Target must be greater than zero'),
  startDate: z.string(),
  endDate: z.string(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const analyticsDashboardQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('week'),
  sportType: z.nativeEnum(SportActivityType).optional(),
});

export type AnalyticsDashboardQuery = z.infer<typeof analyticsDashboardQuerySchema>;

export interface PersonalRecordItem {
  id: string;
  type: PRType;
  sportType: SportActivityType;
  value: number; // seconds for timed benchmarks (1k, 5k, etc.), km for longest distance, sec/km for pace
  formattedValue: string;
  activityId: string;
  activityTitle: string;
  achievedAt: string;
}

export interface TrainingLoadScore {
  score: number; // 0 - 100+ relative effort
  level: 'RECOVERY' | 'MAINTENANCE' | 'OPTIMAL' | 'OVERREACHING';
  weeklyHours: number;
  weeklyDistanceKm: number;
}
