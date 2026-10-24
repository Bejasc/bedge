import { StarboardEntryModel } from '@bedge/database';
import { container } from '@sapphire/framework';
import type { Message, MessageReaction, PartialMessage, PartialMessageReaction } from 'discord.js';
import { getGuildConfig } from '../guild-config.js';
import { countStars, decideStarAction, emojiMatches, pickImage } from './logic.js';
import { renderStarCard } from './render.js';

// Reactions arrive in bursts; recounts for the same message run one at a time so a post is never made twice.
const queues = new Map<string, Promise<void>>();

function serialise(messageId: string, task: () => Promise<void>): Promise<void> {
  const next = (queues.get(messageId) ?? Promise.resolve()).then(task, task);
  queues.set(messageId, next);
  void next.finally(() => {
    if (queues.get(messageId) === next) queues.delete(messageId);
  });
  return next;
}

async function countFor(message: Message<true>, emojiKey: string, selfStar: boolean): Promise<number> {
  const reaction = message.reactions.cache.find((r) => emojiMatches(emojiKey, r.emoji));
  if (!reaction) return 0;
  const users = await reaction.users.fetch({ limit: 100 });
  return countStars([...users.values()].map((u) => ({ id: u.id, bot: u.bot })), message.author.id, selfStar);
}

async function recount(raw: Message | PartialMessage): Promise<void> {
  const message = raw.partial ? await raw.fetch().catch(() => null) : raw;
  if (!message?.inGuild() || message.author.bot) return;

  const { starboard } = await getGuildConfig(message.guildId);
  if (!starboard.enabled || !starboard.channelId || message.channelId === starboard.channelId) return;

  const board = await message.guild.channels.fetch(starboard.channelId).catch(() => null);
  if (!board?.isTextBased() || !board.isSendable()) return;
  const sourceNsfw = 'nsfw' in message.channel && message.channel.nsfw;
  if (sourceNsfw && !('nsfw' in board && board.nsfw)) return;

  const count = await countFor(message, starboard.emoji, starboard.selfStar);
  const entry = await StarboardEntryModel.findOne({ sourceMessageId: message.id });
  const action = decideStarAction(count, starboard.threshold, Boolean(entry?.starboardMessageId), entry?.count ?? 0);
  if (action === 'none') return;

  if (action === 'remove') {
    await board.messages.delete(entry!.starboardMessageId!).catch(() => undefined);
    await StarboardEntryModel.updateOne({ _id: entry!._id }, { $set: { count }, $unset: { starboardMessageId: '' } });
    return;
  }

  const card = renderStarCard({
    authorId: message.author.id,
    authorName: message.member?.displayName ?? message.author.username,
    authorAvatarUrl: message.author.displayAvatarURL(),
    content: message.content,
    imageUrl: pickImage({
      attachments: message.attachments.map((a) => ({ url: a.url, contentType: a.contentType })),
      embedImages: message.embeds.flatMap((e) => [e.image?.url, e.thumbnail?.url]),
    }),
    count,
    emojiKey: starboard.emoji,
    channelId: message.channelId,
    url: message.url,
    createdAt: message.createdAt,
  });

  if (action === 'update') {
    const posted = await board.messages.fetch(entry!.starboardMessageId!).catch(() => null);
    if (posted) {
      await posted.edit(card);
      await StarboardEntryModel.updateOne({ _id: entry!._id }, { $set: { count } });
      return;
    }
  }
  const posted = await board.send(card);
  await StarboardEntryModel.findOneAndUpdate(
    { sourceMessageId: message.id },
    { $set: { guildId: message.guildId, sourceChannelId: message.channelId, starboardMessageId: posted.id, count } },
    { upsert: true },
  );
}

export async function onStarReaction(reaction: MessageReaction | PartialMessageReaction): Promise<void> {
  const full = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
  if (!full?.message.guildId) return;
  const { starboard } = await getGuildConfig(full.message.guildId);
  if (!starboard.enabled || !emojiMatches(starboard.emoji, full.emoji)) return;
  await serialise(full.message.id, () =>
    recount(full.message).catch((error: unknown) => container.logger.warn(`starboard: recount failed — ${String(error)}`)),
  );
}

export async function onReactionsCleared(message: Message | PartialMessage): Promise<void> {
  if (!message.guildId) return;
  await serialise(message.id, () =>
    recount(message).catch((error: unknown) => container.logger.warn(`starboard: recount failed — ${String(error)}`)),
  );
}
