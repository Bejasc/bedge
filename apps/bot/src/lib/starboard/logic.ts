const CUSTOM = /^<a?:\w{2,32}:(\d{17,20})>$|^\w{2,32}:(\d{17,20})$|^(\d{17,20})$/;
const PICTOGRAPHIC = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/** Normalises what an admin typed into the stored key: a custom emoji's ID, or the unicode emoji itself. */
export function parseEmojiInput(input: string): string | null {
  const text = input.trim();
  const custom = text.match(CUSTOM);
  if (custom) return custom[1] ?? custom[2] ?? custom[3];
  if (text && text.length <= 16 && !/\s/.test(text) && PICTOGRAPHIC.test(text)) return text;
  return null;
}

export function displayEmoji(key: string): string {
  return /^\d+$/.test(key) ? `<:star:${key}>` : key;
}

export function emojiMatches(key: string, emoji: { id: string | null; name: string | null }): boolean {
  return emoji.id ? emoji.id === key : emoji.name === key;
}

export interface Reactor {
  id: string;
  bot: boolean;
}

export function countStars(reactors: readonly Reactor[], authorId: string, selfStar: boolean): number {
  return reactors.filter((r) => !r.bot && (selfStar || r.id !== authorId)).length;
}

export type StarAction = 'post' | 'update' | 'remove' | 'none';

export function decideStarAction(count: number, threshold: number, hasPost: boolean, previousCount: number): StarAction {
  if (count >= threshold) return hasPost ? (count === previousCount ? 'none' : 'update') : 'post';
  return hasPost ? 'remove' : 'none';
}

export interface ImageSources {
  attachments: { url: string; contentType: string | null }[];
  embedImages: (string | null | undefined)[];
}

export function pickImage(sources: ImageSources): string | undefined {
  const attachment = sources.attachments.find((a) => a.contentType?.startsWith('image/'));
  return attachment?.url ?? sources.embedImages.find((u): u is string => Boolean(u));
}
