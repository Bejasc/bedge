import { Events, Listener } from '@sapphire/framework';
import type { Collection, GuildTextBasedChannel, Message, PartialMessage, ReadonlyCollection, Snowflake } from 'discord.js';
import { isBulkDeleteSuppressed } from '../../lib/events/suppress.js';
import { log } from '../../lib/logs/router.js';

const EXCERPT_LINES = 10;

export class MessageDeleteBulkLogListener extends Listener<typeof Events.MessageBulkDelete> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.MessageBulkDelete });
  }

  public async run(
    messages: ReadonlyCollection<Snowflake, Message<true> | PartialMessage<true>> | Collection<Snowflake, Message<true> | PartialMessage<true>>,
    channel: GuildTextBasedChannel,
  ): Promise<void> {
    if (isBulkDeleteSuppressed(channel.id)) return;
    const excerpt = [...messages.values()]
      .filter((m): m is Message<true> => !m.partial)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .slice(-EXCERPT_LINES)
      .map((m) => `**${m.author.username}:** ${m.content.slice(0, 120) || '*no text*'}`);

    await log(channel.guild, 'message.bulk_delete', {
      body: excerpt.length ? excerpt.join('\n') : '*None of the messages were cached.*',
      fields: [
        { name: 'Channel', value: `<#${channel.id}>` },
        { name: 'Count', value: String(messages.size) },
      ],
      links: [{ label: 'Jump to channel', url: channel.url }],
    });
  }
}
