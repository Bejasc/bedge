function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  discordToken: required('DISCORD_TOKEN'),
  applicationId: required('DISCORD_APPLICATION_ID'),
  mongoUri: required('MONGODB_URI'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
