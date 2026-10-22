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

export const WelcomeConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().optional(),
  message: z.string().max(1500).optional(),
});
export type WelcomeConfig = z.infer<typeof WelcomeConfigSchema>;

export const StarboardConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().optional(),
  /** A unicode emoji, or a custom emoji's ID. */
  emoji: z.string().default('⭐'),
  threshold: z.number().int().min(1).max(50).default(3),
  selfStar: z.boolean().default(false),
});
export type StarboardConfig = z.infer<typeof StarboardConfigSchema>;

export const BotGameSchema = z.enum(['coinflip', 'highlow', 'dice']);
export type BotGame = z.infer<typeof BotGameSchema>;

export const GamesConfigSchema = z.object({
  pointsEnabled: z.boolean().default(false),
  /** Vs-bot plays per member per UTC day; 0 means unlimited. */
  dailyLimits: z.object({
    coinflip: z.number().int().min(0).default(0),
    highlow: z.number().int().min(0).default(0),
    dice: z.number().int().min(0).default(0),
  }),
});
export type GamesConfig = z.infer<typeof GamesConfigSchema>;

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
  welcome: WelcomeConfigSchema,
  starboard: StarboardConfigSchema,
  games: GamesConfigSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type GuildConfig = z.infer<typeof GuildConfigSchema>;
