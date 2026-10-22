import { ComponentType, MessageFlags } from 'discord.js';
import { PostPayloadSchema, type PostFormat } from '@bedge/types';
import { BRAND_COLOUR } from '../brand.js';

export interface OutgoingPost {
  content?: string;
  embeds?: Record<string, unknown>[];
  components?: Record<string, unknown>[];
  flags?: number;
}

export type BuildResult = { ok: true; payload: OutgoingPost } | { ok: false; error: string };

const V2_TYPES = new Set<number>([
  ComponentType.Section,
  ComponentType.TextDisplay,
  ComponentType.Thumbnail,
  ComponentType.MediaGallery,
  ComponentType.File,
  ComponentType.Separator,
  ComponentType.Container,
]);

export const TEXT_MAX = 2000;
export const CARD_MAX = 4000;

export function hasV2Components(components: unknown): boolean {
  if (!Array.isArray(components)) return false;
  return components.some((c) => {
    if (!c || typeof c !== 'object') return false;
    const obj = c as Record<string, unknown>;
    return V2_TYPES.has(Number(obj.type)) || hasV2Components(obj.components) || hasV2Components(obj.accessory ? [obj.accessory] : []);
  });
}

export function cardComponents(text: string, accentColour = BRAND_COLOUR): Record<string, unknown>[] {
  return [{ type: ComponentType.Container, accent_color: accentColour, components: [{ type: ComponentType.TextDisplay, content: text }] }];
}

function parseJson(content: string): BuildResult {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    return { ok: false, error: `That isn't valid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
  const parsed = PostPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `\`${i.path.join('.') || 'payload'}\`: ${i.message}`).join('\n') };
  }
  const payload: OutgoingPost = { ...parsed.data };
  if (hasV2Components(payload.components)) {
    if (payload.content || payload.embeds?.length) {
      return { ok: false, error: 'Components V2 messages can’t also have `content` or `embeds` — put the text in a text display.' };
    }
    payload.flags = (payload.flags ?? 0) | MessageFlags.IsComponentsV2;
  }
  if (!payload.content && !payload.embeds?.length && !payload.components?.length) {
    return { ok: false, error: 'The payload needs `content`, `embeds` or `components`.' };
  }
  return { ok: true, payload };
}

export function buildPostPayload(format: PostFormat, content: string): BuildResult {
  const text = content.trim();
  if (!text) return { ok: false, error: 'There’s nothing to post.' };
  switch (format) {
    case 'text':
      return text.length > TEXT_MAX
        ? { ok: false, error: `Plain text is limited to ${TEXT_MAX} characters — use *Card* for up to ${CARD_MAX}.` }
        : { ok: true, payload: { content: text } };
    case 'card':
      return text.length > CARD_MAX
        ? { ok: false, error: `Cards are limited to ${CARD_MAX} characters.` }
        : { ok: true, payload: { components: cardComponents(text), flags: MessageFlags.IsComponentsV2 } };
    case 'json':
      return parseJson(text);
  }
}

export interface ExistingMessage {
  content: string;
  embeds: Record<string, unknown>[];
  components: Record<string, unknown>[];
  flags: number;
}

/** Turns a sent message back into a format and editable content, so it can be edited in the same modal. */
export function inferFormat(message: ExistingMessage): { format: PostFormat; content: string } {
  if (message.flags & MessageFlags.IsComponentsV2) {
    const [only] = message.components;
    const inner = only?.components as Record<string, unknown>[] | undefined;
    if (
      message.components.length === 1 &&
      only.type === ComponentType.Container &&
      inner?.length === 1 &&
      inner[0].type === ComponentType.TextDisplay
    ) {
      return { format: 'card', content: String(inner[0].content ?? '') };
    }
    return { format: 'json', content: JSON.stringify({ components: message.components }, null, 2) };
  }
  if (message.embeds.length || message.components.length) {
    const payload: OutgoingPost = {};
    if (message.content) payload.content = message.content;
    if (message.embeds.length) payload.embeds = message.embeds;
    if (message.components.length) payload.components = message.components;
    return { format: 'json', content: JSON.stringify(payload, null, 2) };
  }
  return { format: 'text', content: message.content };
}
