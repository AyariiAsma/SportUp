import { z } from 'zod';

export const eventCheckinSchema = z.object({
  checkinToken: z.string().min(1, 'Checkin token is required'),
});

export type EventCheckinInput = z.infer<typeof eventCheckinSchema>;

export const createEventAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  content: z.string().min(1, 'Content is required').max(2000),
  isPinned: z.boolean().default(false),
});

export type CreateEventAnnouncementInput = z.infer<typeof createEventAnnouncementSchema>;

export const createRecurringEventSchema = z.object({
  recurrenceRule: z.string().optional(), // e.g. "FREQ=WEEKLY;BYDAY=SA;INTERVAL=1"
  seriesTitle: z.string().optional(),
});
