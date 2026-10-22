import { z } from 'zod';

export const LogCategorySchema = z.enum(['messages', 'members', 'moderation', 'voice', 'server']);
export type LogCategory = z.infer<typeof LogCategorySchema>;
export const LOG_CATEGORIES = LogCategorySchema.options;

export const LogCategoryConfigSchema = z.object({
  channelId: z.string().optional(),
  enabled: z.boolean().default(true),
});
export type LogCategoryConfig = z.infer<typeof LogCategoryConfigSchema>;

export const GuildRolesConfigSchema = z.object({
  modRoleId: z.string().optional(),
  adminRoleId: z.string().optional(),
});
export type GuildRolesConfig = z.infer<typeof GuildRolesConfigSchema>;

export const GuildConfigSchema = z.object({
  guildId: z.string(),
  defaultLogChannelId: z.string().optional(),
  logs: z.object({
    messages: LogCategoryConfigSchema,
    members: LogCategoryConfigSchema,
    moderation: LogCategoryConfigSchema,
    voice: LogCategoryConfigSchema,
    server: LogCategoryConfigSchema,
  }),
  roles: GuildRolesConfigSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type GuildConfig = z.infer<typeof GuildConfigSchema>;
