import { Events, Listener } from '@sapphire/framework';
import type { GuildMember, PartialGuildMember } from 'discord.js';
import { formatDuration } from '../../lib/events/format.js';
import { log } from '../../lib/logs/router.js';
import { moderationButtons } from '../../lib/moderation/buttons.js';
import { subjectOf } from '../../lib/logs/subject.js';
import type { LogField } from '../../lib/logs/types.js';

export class GuildMemberRemoveLogListener extends Listener<typeof Events.GuildMemberRemove> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.GuildMemberRemove });
  }

  public async run(member: GuildMember | PartialGuildMember): Promise<void> {
    const roles = member.partial
      ? []
      : member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => `<@&${r.id}>`);
    const fields: LogField[] = [
      { name: 'Time in server', value: member.joinedTimestamp ? formatDuration(Date.now() - member.joinedTimestamp) : 'Unknown' },
      { name: 'Roles', value: roles.length ? roles.join(' ') : member.partial ? 'Unknown (not cached)' : 'None' },
      { name: 'Member count', value: String(member.guild.memberCount) },
    ];
    await log(member.guild, 'member.leave', {
      subject: subjectOf(member),
      fields,
      actions: moderationButtons(member.guild.id, member.id),
    });
  }
}
