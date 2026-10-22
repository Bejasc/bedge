import { Events, Listener } from '@sapphire/framework';
import type { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';
import { editBody, isRealEdit } from '../../lib/events/diffs.js';
import { log } from '../../lib/logs/router.js';
import { moderationButtons } from '../../lib/moderation/buttons.js';
import { subjectOf } from '../../lib/logs/subject.js';

type AnyMessage = OmitPartialGroupDMChannel<Message | PartialMessage>;

export class MessageUpdateLogListener extends Listener<typeof Events.MessageUpdate> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.MessageUpdate });
  }

  public async run(oldMessage: AnyMessage, newMessage: AnyMessage): Promise<void> {
    if (!newMessage.inGuild() || !newMessage.author || newMessage.author.bot) return;
    const snapshot = {
      oldContent: oldMessage.partial ? null : oldMessage.content,
      newContent: newMessage.content,
      oldEditedAt: oldMessage.partial ? null : oldMessage.editedTimestamp,
      newEditedAt: newMessage.editedTimestamp,
    };
    if (!isRealEdit(snapshot)) return;

    await log(newMessage.guild, 'message.edit', {
      subject: subjectOf(newMessage.author),
      body: editBody(snapshot.oldContent, snapshot.newContent),
      fields: [{ name: 'Channel', value: `<#${newMessage.channelId}>` }],
      links: [{ label: 'Jump to message', url: newMessage.url }],
      actions: moderationButtons(newMessage.guildId, newMessage.author.id),
    });
  }
}
