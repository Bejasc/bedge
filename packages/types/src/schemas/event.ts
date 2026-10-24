import { z } from 'zod';

export const RsvpStatusSchema = z.enum(['going', 'maybe', 'no']);
export type RsvpStatus = z.infer<typeof RsvpStatusSchema>;

/** Reminder offsets before the start; `start` fires at the start time itself. */
export const ReminderOffsetSchema = z.enum(['1w', '1d', '12h', '6h', '3h', '1h', '30m', '15m', '10m', '5m', 'start']);
export type ReminderOffset = z.infer<typeof ReminderOffsetSchema>;

export const EventRsvpSchema = z.object({
  userId: z.string(),
  status: RsvpStatusSchema,
});
export type EventRsvp = z.infer<typeof EventRsvpSchema>;

export const GuildEventSchema = z.object({
  guildId: z.string(),
  eventNumber: z.number().int().positive(),
  channelId: z.string(),
  messageId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(3000).optional(),
  imageUrl: z.string().url().optional(),
  startsAt: z.string().datetime(),
  timezone: z.string(),
  hostId: z.string(),
  pingRoleId: z.string().optional(),
  reminderChannelIds: z.array(z.string()).max(5),
  reminderOffsets: z.array(ReminderOffsetSchema),
  sentOffsets: z.array(ReminderOffsetSchema),
  rsvps: z.array(EventRsvpSchema),
  cancelled: z.boolean(),
});
export type GuildEvent = z.infer<typeof GuildEventSchema>;
