import { Events, Listener } from '@sapphire/framework';
import type { VoiceState } from 'discord.js';
import { classifyVoice } from '../../lib/events/diffs.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';

export class VoiceStateUpdateLogListener extends Listener<typeof Events.VoiceStateUpdate> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.VoiceStateUpdate });
  }

  public async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const key = classifyVoice(oldState.channelId, newState.channelId);
    const member = newState.member ?? oldState.member;
    if (!key || !member || member.user.bot) return;

    const fields =
      key === 'voice.move'
        ? [
            { name: 'From', value: `<#${oldState.channelId}>` },
            { name: 'To', value: `<#${newState.channelId}>` },
          ]
        : [{ name: 'Channel', value: `<#${newState.channelId ?? oldState.channelId}>` }];
    const channel = newState.channel ?? oldState.channel;

    await log(newState.guild, key, {
      subject: subjectOf(member),
      fields,
      links: channel ? [{ label: 'Jump to channel', url: channel.url }] : [],
    });
  }
}
