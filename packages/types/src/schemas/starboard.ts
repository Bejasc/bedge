import { z } from 'zod';

export const StarboardEntrySchema = z.object({
  guildId: z.string(),
  sourceChannelId: z.string(),
  sourceMessageId: z.string(),
  starboardMessageId: z.string().optional(),
  count: z.number().int().nonnegative(),
});
export type StarboardEntry = z.infer<typeof StarboardEntrySchema>;
