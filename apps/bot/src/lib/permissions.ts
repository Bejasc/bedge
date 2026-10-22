import { PermissionFlagsBits, type GuildMember, type APIInteractionGuildMember } from 'discord.js';
import type { GuildRolesConfig } from '@bedge/types';

export type Tier = 'owner' | 'admin' | 'mod' | 'none';

export const TIER_RANK: Record<Tier, number> = { none: 0, mod: 1, admin: 2, owner: 3 };

export const TIER_LABELS: Record<Tier, string> = {
  owner: 'Owner',
  admin: 'Admin',
  mod: 'Mod',
  none: 'Everyone',
};

export interface TierSubject {
  id: string;
  roleIds: readonly string[];
  isAdministrator: boolean;
}

export function resolveTier(subject: TierSubject, roles: GuildRolesConfig | null | undefined, ownerId: string): Tier {
  if (subject.id === ownerId) return 'owner';
  if (roles?.adminRoleId) {
    if (subject.roleIds.includes(roles.adminRoleId)) return 'admin';
  } else if (subject.isAdministrator) {
    return 'admin';
  }
  if (roles?.modRoleId && subject.roleIds.includes(roles.modRoleId)) return 'mod';
  return 'none';
}

export function tierAtLeast(actual: Tier, required: Tier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required];
}

export function tierSubjectFromMember(member: GuildMember | APIInteractionGuildMember): TierSubject {
  if ('guild' in member) {
    return {
      id: member.id,
      roleIds: [...member.roles.cache.keys()],
      isAdministrator: member.permissions.has(PermissionFlagsBits.Administrator),
    };
  }
  return {
    id: member.user.id,
    roleIds: member.roles,
    isAdministrator: (BigInt(member.permissions) & PermissionFlagsBits.Administrator) !== 0n,
  };
}

// Coarse first filter shown in Discord's UI; the tier preconditions are the real gate.
export const TIER_DEFAULT_PERMISSIONS: Record<Exclude<Tier, 'none'>, bigint> = {
  mod: PermissionFlagsBits.ManageMessages,
  admin: PermissionFlagsBits.ManageGuild,
  owner: PermissionFlagsBits.Administrator,
};
