import { Events, Listener } from '@sapphire/framework';
import type { Guild, Invite } from 'discord.js';
import { trackInviteDeleted } from '../../lib/events/invite-tracker.js';
import { log } from '../../lib/logs/router.js';

export class InviteDeleteLogListener extends Listener<typeof Events.InviteDelete> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.InviteDelete });
  }

  public async run(invite: Invite): Promise<void> {
    const guild = invite.guild;
    if (!guild || !('members' in guild)) return;
    trackInviteDeleted(guild.id, invite.code);

    await log(guild as Guild, 'invite.delete', {
      fields: [
        { name: 'Code', value: `\`${invite.code}\`` },
        { name: 'Channel', value: invite.channelId ? `<#${invite.channelId}>` : 'Unknown' },
      ],
    });
  }
}
