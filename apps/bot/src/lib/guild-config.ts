import { GuildConfigModel } from '@bedge/database';
import type { GuildConfig } from '@bedge/types';

export type GuildConfigData = Omit<GuildConfig, 'createdAt' | 'updatedAt'>;

const cache = new Map<string, GuildConfigData>();

function toData(doc: InstanceType<typeof GuildConfigModel>): GuildConfigData {
  const obj = doc.toObject();
  return {
    guildId: obj.guildId,
    defaultLogChannelId: obj.defaultLogChannelId ?? undefined,
    logs: obj.logs,
    roles: obj.roles ?? {},
    welcome: obj.welcome ?? { enabled: false },
    starboard: obj.starboard ?? { enabled: false, emoji: '⭐', threshold: 3, selfStar: false },
    games: obj.games ?? { pointsEnabled: false, dailyLimits: { coinflip: 0, highlow: 0, dice: 0 } },
  };
}

export async function getGuildConfig(guildId: string): Promise<GuildConfigData> {
  const cached = cache.get(guildId);
  if (cached) return cached;
  const doc = await GuildConfigModel.findOneAndUpdate(
    { guildId },
    { $setOnInsert: { guildId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const data = toData(doc);
  cache.set(guildId, data);
  return data;
}

export async function updateGuildConfig(
  guildId: string,
  update: { $set?: Record<string, unknown>; $unset?: Record<string, ''> },
): Promise<GuildConfigData> {
  const doc = await GuildConfigModel.findOneAndUpdate({ guildId }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  const data = toData(doc);
  cache.set(guildId, data);
  return data;
}
