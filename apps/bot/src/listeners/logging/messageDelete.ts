import { Events, Listener } from '@sapphire/framework';
import type { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';
import { UNCACHED } from '../../lib/events/diffs.js';
import { discordTime, quote } from '../../lib/events/format.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import type { LogField } from '../../lib/logs/types.js';

export class MessageDeleteLogListener extends Listener<typeof Events.MessageDelete> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.MessageDelete });
  }

  public async run(message: OmitPartialGroupDMChannel<Message | PartialMessage>): Promise<void> {
    if (!message.guild || message.author?.bot) return;

    const fields: LogField[] = [
      { name: 'Channel', value: `<#${message.channelId}>` },
      { name: 'Sent', value: discordTime(message.createdTimestamp, 'R') },
    ];
    const attachments = message.attachments?.map((a) => a.name) ?? [];
    if (attachments.length) fields.push({ name: 'Attachments', value: attachments.join(', ') });

    const body = message.partial ? UNCACHED : message.content ? quote(message.content, 1400) : '*No text content*';
    const channel = message.channel;

    await log(message.guild, 'message.delete', {
      subject: message.author ? subjectOf(message.author) : undefined,
      body,
      fields,
      links: channel ? [{ label: 'Jump to context', url: channel.url }] : [],
    });
  }
}
