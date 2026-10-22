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
]);
