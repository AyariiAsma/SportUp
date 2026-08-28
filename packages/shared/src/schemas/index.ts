import { z } from 'zod';
import { Difficulty, RunningLevel, PostCategory } from '../types/enums';

// ─── Auth Schemas ────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ─── User Schemas ────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  bio: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  runningLevel: z.nativeEnum(RunningLevel).optional(),
  preferredSports: z.array(z.string()).optional(),
});

// ─── Event Schemas ───────────────────────────────────────

export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  sportId: z.string().min(1, 'Sport is required'),
  difficulty: z.nativeEnum(Difficulty).optional(),
  maxParticipants: z.number().int().min(2).max(10000).optional(),
  distanceKm: z.number().min(0).max(1000).optional(), // running distance in km
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(5).max(1440).optional(),
  locationName: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  coverImage: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  routeCoordinates: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const routePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  order: z.number().int().min(0),
});

export const createRouteSchema = z.object({
  points: z.array(routePointSchema).min(2, 'Route must have at least 2 points'),
  distanceKm: z.number().min(0).optional(),
  encodedPath: z.string().optional(),
});

// ─── Event Query Schemas ─────────────────────────────────

export const eventQuerySchema = z.object({
  sportId: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).default(50),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['date', 'distance', 'created']).default('date'),
});

// ─── Post Schemas ────────────────────────────────────────

export const createPostSchema = z.object({
  content: z.string().max(5000).optional(),
  category: z.nativeEnum(PostCategory).default(PostCategory.GENERAL),
  mediaIds: z.array(z.string()).max(10).optional(),
});

// ─── Comment Schemas ─────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

// ─── Report Schemas ──────────────────────────────────────

export const createReportSchema = z.object({
  targetType: z.enum(['POST', 'REEL', 'USER', 'EVENT']),
  targetId: z.string().min(1),
  reason: z.string().min(10, 'Please provide more detail').max(1000),
});

// ─── Type exports from schemas ───────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;

export { RunningLevel };
