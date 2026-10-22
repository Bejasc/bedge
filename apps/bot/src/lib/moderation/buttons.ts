import { ButtonBuilder, ButtonStyle } from 'discord.js';

export type ModButtonAction = 'lookup' | 'note' | 'moderate' | 'warn' | 'timeout' | 'kick' | 'ban';

/** Format: `mod:<action>:<guildId>:<userId>`; the guild is the one the user belongs to, which differs from the interaction's guild on the admin mirror. */
export function modButtonId(action: ModButtonAction, guildId: string, userId: string): string {
  return `mod:${action}:${guildId}:${userId}`;
}

export function parseModButtonId(customId: string): { action: ModButtonAction; guildId: string; userId: string } | null {
  const [prefix, action, guildId, userId] = customId.split(':');
  if (prefix !== 'mod' || !action || !guildId || !userId) return null;
  return { action: action as ModButtonAction, guildId, userId };
}

export function modalId(type: string, guildId: string, userId: string): string {
  return `modmodal:${type}:${guildId}:${userId}`;
}

export function parseModalId(customId: string): { type: string; guildId: string; userId: string } | null {
  const [prefix, type, guildId, userId] = customId.split(':');
  if (prefix !== 'modmodal' || !type || !guildId || !userId) return null;
  return { type, guildId, userId };
}

/** The *Lookup*, *Note* and *Moderate…* buttons carried on member, message, AutoMod and case logs. */
export function moderationButtons(guildId: string, userId: string): ButtonBuilder[] {
  return [
    new ButtonBuilder().setCustomId(modButtonId('lookup', guildId, userId)).setStyle(ButtonStyle.Secondary).setLabel('Lookup').setEmoji('🔎'),
    new ButtonBuilder().setCustomId(modButtonId('note', guildId, userId)).setStyle(ButtonStyle.Secondary).setLabel('Note').setEmoji('📝'),
    new ButtonBuilder().setCustomId(modButtonId('moderate', guildId, userId)).setStyle(ButtonStyle.Danger).setLabel('Moderate…'),
  ];
}
