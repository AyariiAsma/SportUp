import { z } from 'zod';
import { SportActivityType, ClubRole } from '../types/enums';

export const clubRoleSchema = z.nativeEnum(ClubRole);

export const createClubSchema = z.object({
  name: z.string().min(3, 'Club name must be at least 3 characters').max(100),
  description: z.string().max(1000).optional(),
  coverUrl: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  sportType: z.nativeEnum(SportActivityType).default(SportActivityType.RUN),
  isPrivate: z.boolean().default(false),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;

export const clubQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sportType: z.nativeEnum(SportActivityType).optional(),
  city: z.string().optional(),
  search: z.string().optional(),
});

export type ClubQueryInput = z.input<typeof clubQuerySchema>;

export const createClubPostSchema = z.object({
  content: z.string().min(1, 'Post content cannot be empty').max(2000),
  mediaUrls: z.array(z.string().url()).max(5).default([]),
});

export type CreateClubPostInput = z.infer<typeof createClubPostSchema>;
