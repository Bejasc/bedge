import { z } from 'zod';

export const PostFormatSchema = z.enum(['text', 'card', 'json']);
export type PostFormat = z.infer<typeof PostFormatSchema>;

/** A raw Discord message payload as accepted by JSON posting; Discord validates the component and embed internals. */
export const PostPayloadSchema = z.object({
  content: z.string().max(2000).optional(),
  embeds: z.array(z.record(z.string(), z.unknown())).max(10).optional(),
  components: z.array(z.record(z.string(), z.unknown())).max(40).optional(),
  flags: z.number().int().nonnegative().optional(),
});
export type PostPayload = z.infer<typeof PostPayloadSchema>;

export const PersonaSchema = z.object({
  guildId: z.string(),
  name: z.string().min(1).max(80),
  avatarUrl: z.string().url().optional(),
});
export type Persona = z.infer<typeof PersonaSchema>;

export const PostTemplateSchema = z.object({
  guildId: z.string(),
  name: z.string().min(1).max(100),
  format: PostFormatSchema,
  content: z.string().max(4000),
  createdBy: z.string(),
});
export type PostTemplate = z.infer<typeof PostTemplateSchema>;
