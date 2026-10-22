import type { LogType } from './types.js';

export const COLOURS = {
  blurple: 0x5865f2,
  green: 0x57f287,
  yellow: 0xfee75c,
  orange: 0xe67e22,
  red: 0xed4245,
  grey: 0x95a5a6,
  teal: 0x1abc9c,
  purple: 0x9b59b6,
} as const;

const types = new Map<string, LogType>();

export function registerLogTypes(list: LogType[]): void {
  for (const type of list) types.set(type.key, type);
}

export function getLogType(key: string): LogType {
  const type = types.get(key);
  if (!type) throw new Error(`Unknown log type: ${key}`);
  return type;
}

registerLogTypes([
  { key: 'test', category: 'server', emoji: '🧪', title: 'Test log', accentColour: COLOURS.blurple },
  { key: 'server.config', category: 'server', emoji: '⚙️', title: 'Config changed', accentColour: COLOURS.grey },
  { key: 'bot.joined', category: 'server', emoji: '📥', title: 'Bot added to server', accentColour: COLOURS.green },
  { key: 'bot.removed', category: 'server', emoji: '📤', title: 'Bot removed from server', accentColour: COLOURS.red },

  { key: 'message.edit', category: 'messages', emoji: '✏️', title: 'Message edited', accentColour: COLOURS.yellow },
  { key: 'message.delete', category: 'messages', emoji: '🗑️', title: 'Message deleted', accentColour: COLOURS.red },
  { key: 'message.bulk_delete', category: 'messages', emoji: '🧹', title: 'Messages bulk deleted', accentColour: COLOURS.red },

  { key: 'member.join', category: 'members', emoji: '👋', title: 'Member joined', accentColour: COLOURS.green },
  { key: 'member.leave', category: 'members', emoji: '🚪', title: 'Member left', accentColour: COLOURS.orange },
  { key: 'member.nickname', category: 'members', emoji: '🏷️', title: 'Nickname changed', accentColour: COLOURS.blurple },
  { key: 'member.roles', category: 'members', emoji: '🎭', title: 'Roles changed', accentColour: COLOURS.blurple },

  { key: 'voice.join', category: 'voice', emoji: '🔊', title: 'Joined voice', accentColour: COLOURS.green },
  { key: 'voice.leave', category: 'voice', emoji: '🔇', title: 'Left voice', accentColour: COLOURS.orange },
  { key: 'voice.move', category: 'voice', emoji: '🔀', title: 'Moved voice channel', accentColour: COLOURS.teal },

  { key: 'invite.create', category: 'server', emoji: '🔗', title: 'Invite created', accentColour: COLOURS.teal },
  { key: 'invite.delete', category: 'server', emoji: '⛓️‍💥', title: 'Invite deleted', accentColour: COLOURS.grey },

  { key: 'mod.kick', category: 'moderation', emoji: '👢', title: 'Member kicked', accentColour: COLOURS.orange },
  { key: 'mod.ban', category: 'moderation', emoji: '🔨', title: 'Member banned', accentColour: COLOURS.red },
  { key: 'mod.unban', category: 'moderation', emoji: '🕊️', title: 'Member unbanned', accentColour: COLOURS.green },
  { key: 'mod.timeout', category: 'moderation', emoji: '⏳', title: 'Member timed out', accentColour: COLOURS.yellow },
  { key: 'mod.untimeout', category: 'moderation', emoji: '⌛', title: 'Timeout removed', accentColour: COLOURS.green },
  { key: 'mod.purge', category: 'moderation', emoji: '🧹', title: 'Messages purged', accentColour: COLOURS.orange },
  { key: 'automod.action', category: 'moderation', emoji: '🛡️', title: 'AutoMod triggered', accentColour: COLOURS.purple },
]);
