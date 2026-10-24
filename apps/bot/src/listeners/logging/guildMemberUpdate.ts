import { Events, Listener } from '@sapphire/framework';
import type { GuildMember, PartialGuildMember } from 'discord.js';
import { diffMember, type MemberSnapshot } from '../../lib/events/diffs.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';

function snapshotOf(member: GuildMember): MemberSnapshot {
  return { nickname: member.nickname, roleIds: [...member.roles.cache.keys()] };
}

const roleList = (ids: string[]) => ids.map((id) => `<@&${id}>`).join(' ');

export class GuildMemberUpdateLogListener extends Listener<typeof Events.GuildMemberUpdate> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.GuildMemberUpdate });
  }

  public async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
    if (oldMember.partial) return;
    const diff = diffMember(snapshotOf(oldMember), snapshotOf(newMember));
    const subject = subjectOf(newMember);

    if (diff.nickname) {
      await log(newMember.guild, 'member.nickname', {
        subject,
        fields: [
          { name: 'Before', value: diff.nickname.before ?? '*none*' },
          { name: 'After', value: diff.nickname.after ?? '*none*' },
        ],
      });
    }

    if (diff.addedRoles.length || diff.removedRoles.length) {
      const fields = [];
      if (diff.addedRoles.length) fields.push({ name: 'Added', value: roleList(diff.addedRoles) });
      if (diff.removedRoles.length) fields.push({ name: 'Removed', value: roleList(diff.removedRoles) });
      await log(newMember.guild, 'member.roles', { subject, fields });
    }
  }
}
