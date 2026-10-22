import { container } from '@sapphire/framework';
import {
  ChannelType,
  type GuildTextBasedChannel,
  type Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  type Webhook,
} from 'discord.js';
import type { OutgoingPost } from './payload.js';

const WEBHOOK_NAME = 'BedgeBot Personas';

export const POST_MENTIONS = { parse: ['users', 'roles', 'everyone'] as ('users' | 'roles' | 'everyone')[] };

export interface PersonaIdentity {
  name: string;
  avatarUrl?: string;
}

/** The single bedge-owned webhook for a channel (the parent, for threads), created on first use. */
async function channelWebhook(channel: GuildTextBasedChannel): Promise<{ webhook: Webhook; threadId?: string }> {
  const parent = channel.isThread() ? channel.parent : channel;
  if (!parent || !('fetchWebhooks' in parent)) throw new Error('Personas can’t post in this kind of channel.');
  const hooks = await parent.fetchWebhooks();
  const botId = container.client.user!.id;
  const existing = hooks.find((h) => h.owner?.id === botId && h.name === WEBHOOK_NAME && h.token);
  const webhook = existing ?? (await parent.createWebhook({ name: WEBHOOK_NAME, reason: 'BedgeBot personas' }));
  return { webhook, threadId: channel.isThread() ? channel.id : undefined };
}

export async function sendPost(channel: GuildTextBasedChannel, payload: OutgoingPost, persona?: PersonaIdentity): Promise<Message> {
  if (!persona) {
    return channel.send({ ...payload, allowedMentions: POST_MENTIONS } as MessageCreateOptions);
  }
  const { webhook, threadId } = await channelWebhook(channel);
  return webhook.send({
    ...payload,
    username: persona.name,
    avatarURL: persona.avatarUrl,
    threadId,
    withComponents: Boolean(payload.components?.length),
    allowedMentions: POST_MENTIONS,
  } as Parameters<Webhook['send']>[0]);
}

/** Replaces the whole message so switching formats doesn't leave stale content, embeds or components behind. */
function editOptions(payload: OutgoingPost): MessageEditOptions {
  return {
    content: payload.content ?? (payload.flags ? null : ''),
    embeds: payload.embeds ?? [],
    components: payload.components ?? [],
    flags: payload.flags,
    allowedMentions: POST_MENTIONS,
  } as unknown as MessageEditOptions;
}

export function isEditable(message: Message): boolean {
  return message.author.id === container.client.user!.id || message.webhookId !== null;
}

export async function editPost(message: Message<true>, payload: OutgoingPost): Promise<Message> {
  if (!message.webhookId) return message.edit(editOptions(payload));
  const { webhook, threadId } = await channelWebhook(message.channel);
  if (webhook.id !== message.webhookId) throw new Error('That message was sent by a webhook bedge doesn’t own.');
  return webhook.editMessage(message, { ...editOptions(payload), threadId, withComponents: true } as Parameters<Webhook['editMessage']>[1]);
}

export const POSTABLE_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
] as const;
