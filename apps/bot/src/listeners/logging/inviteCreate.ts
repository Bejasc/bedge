import { Events, Listener } from '@sapphire/framework';
import type { Guild, Invite } from 'discord.js';
import { discordTime } from '../../lib/events/format.js';
import { trackInviteCreated } from '../../lib/events/invite-tracker.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';

export class InviteCreateLogListener extends Listener<typeof Events.InviteCreate> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.InviteCreate });
  }

  public async run(invite: Invite): Promise<void> {
    const guild = invite.guild;
    if (!guild || !('members' in guild)) return;
    trackInviteCreated(guild.id, invite.code, invite.inviterId ?? undefined);

    await log(guild as Guild, 'invite.create', {
      subject: invite.inviter ? subjectOf(invite.inviter) : undefined,
      fields: [
        { name: 'Code', value: `\`${invite.code}\`` },
        { name: 'Channel', value: invite.channelId ? `<#${invite.channelId}>` : 'Unknown' },
        { name: 'Max uses', value: invite.maxUses ? String(invite.maxUses) : 'Unlimited' },
        { name: 'Expires', value: invite.expiresTimestamp ? discordTime(invite.expiresTimestamp, 'R') : 'Never' },
      ],
    });
  }
}
