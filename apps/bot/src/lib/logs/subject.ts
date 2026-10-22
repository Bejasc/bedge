import type { GuildMember, PartialGuildMember, PartialUser, User } from 'discord.js';
import type { LogSubject } from './types.js';

export function subjectOf(target: User | PartialUser | GuildMember | PartialGuildMember): LogSubject {
  const user = 'user' in target ? target.user : target;
  return {
    id: user.id,
    label: user.username ?? user.id,
    avatarUrl: target.displayAvatarURL(),
  };
}
