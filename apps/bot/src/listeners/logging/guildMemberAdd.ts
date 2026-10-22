import { Events, Listener } from '@sapphire/framework';
import type { GuildMember, Message } from 'discord.js';
import { discordTime, formatDuration, NEW_ACCOUNT_MS } from '../../lib/events/format.js';
import { resolveUsedInvite } from '../../lib/events/invite-tracker.js';
import { renderWelcomeCard, renderWelcomeText } from '../../lib/events/welcome.js';
import { getGuildConfig } from '../../lib/guild-config.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import type { LogField, LogLink } from '../../lib/logs/types.js';

async function postWelcome(member: GuildMember): Promise<Message | null> {
  const { welcome } = await getGuildConfig(member.guild.id);
  if (!welcome.enabled || !welcome.channelId) return null;
  const channel = await member.guild.channels.fetch(welcome.channelId).catch(() => null);
  if (!channel?.isSendable()) return null;
  const text = renderWelcomeText(welcome.message, {
    userId: member.id,
    username: member.user.username,
    server: member.guild.name,
    memberCount: member.guild.memberCount,
  });
  return channel.send(renderWelcomeCard(text, member.displayAvatarURL(), member.id)).catch(() => null);
}

export class GuildMemberAddLogListener extends Listener<typeof Events.GuildMemberAdd> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.GuildMemberAdd });
  }

  public async run(member: GuildMember): Promise<void> {
    const [invite, welcome] = await Promise.all([resolveUsedInvite(member.guild), postWelcome(member)]);
    const accountAge = Date.now() - member.user.createdTimestamp;

    const fields: LogField[] = [
      {
        name: 'Account created',
        value: `${discordTime(member.user.createdTimestamp, 'D')} (${formatDuration(accountAge)} ago)${accountAge < NEW_ACCOUNT_MS ? ' ⚠️ **New account**' : ''}`,
      },
      { name: 'Member count', value: String(member.guild.memberCount) },
      {
        name: 'Invite',
        value: invite
          ? `\`${invite.code}\`${invite.inviterId ? ` by <@${invite.inviterId}>` : ''}${invite.guessed ? ' *(vanity, likely)*' : ''}`
          : 'Unknown',
      },
    ];
    const links: LogLink[] = welcome ? [{ label: 'Welcome message', url: welcome.url }] : [];

    await log(member.guild, 'member.join', { subject: subjectOf(member), fields, links });
  }
}
