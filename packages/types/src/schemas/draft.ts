import { z } from 'zod';
import { PostPayloadSchema } from './posting.js';

export const DraftSourceSchema = z.object({
  guildId: z.string(),
  channelId: z.string(),
  messageId: z.string(),
});
export type DraftSource = z.infer<typeof DraftSourceSchema>;

export const DraftSchema = z.object({
  code: z.string().length(8),
  payload: PostPayloadSchema,
  source: DraftSourceSchema.optional(),
  createdAt: z.string().datetime().optional(),
});
export type Draft = z.infer<typeof DraftSchema>;

/** Body accepted by `POST /api/drafts`; a builder save keeps the source of a draft it loaded. */
export const DraftCreateSchema = z.object({
  payload: PostPayloadSchema,
  source: DraftSourceSchema.optional(),
});
export type DraftCreate = z.infer<typeof DraftCreateSchema>;
