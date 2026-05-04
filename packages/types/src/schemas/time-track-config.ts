import { z } from 'zod';

export const TimeTrackConfigSchema = z.object({
  guildId: z.string(),
  memberId: z.string(),
  timezone: z.string(),
  categoryId: z.string(),
  channelId: z.string().optional(),
  alias: z.string(),
  createdAt: z.string().datetime(),
});

export type TimeTrackConfig = z.infer<typeof TimeTrackConfigSchema>;
