import type { Client } from 'discord.js';

export const BRAND_NAME = 'BedgeBot';
export const BRAND_EMOJI_NAME = 'bedgebot';
export const BRAND_COLOUR = 0x5865f2;

let brandEmoji: string | undefined;

export function brandFooter(at: Date = new Date()): string {
  const unix = Math.floor(at.getTime() / 1000);
  const prefix = brandEmoji ? `${brandEmoji} ` : '';
  return `-# ${prefix}${BRAND_NAME} • <t:${unix}:f>`;
}

export function setBrandEmoji(emoji: string | undefined): void {
  brandEmoji = emoji;
}

// The emoji is uploaded once as an application emoji in the Developer Portal; until then the footer is text-only.
export async function loadBrandEmoji(client: Client<true>): Promise<boolean> {
  const emojis = await client.application.emojis.fetch();
  const emoji = emojis.find((e) => e.name === BRAND_EMOJI_NAME);
  setBrandEmoji(emoji ? `<:${emoji.name}:${emoji.id}>` : undefined);
  return Boolean(emoji);
}
