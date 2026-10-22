function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  discordToken: required('DISCORD_TOKEN'),
  applicationId: required('DISCORD_APPLICATION_ID'),
  mongoUri: required('MONGODB_URI'),
  ownerId: required('OWNER_ID'),
  adminGuildId: process.env.ADMIN_GUILD_ID || undefined,
  adminLogChannelId: process.env.ADMIN_LOG_CHANNEL_ID || undefined,
  builderUrl: process.env.BUILDER_URL?.replace(/\/+$/, '') || undefined,
  logLevel: process.env.LOG_LEVEL ?? 'info',
  timeChannelCron: process.env.TIME_CHANNEL_CRON ?? '*/15 * * * *',
};
