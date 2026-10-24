import { container } from '@sapphire/framework';
import { PermissionFlagsBits, type Guild } from 'discord.js';
import { findUsedInvite } from './diffs.js';

export interface UsedInvite {
  code: string;
  inviterId?: string;
  /** True when the code is a guess (the vanity URL) rather than a measured use. */
  guessed?: boolean;
}

const uses = new Map<string, Map<string, number>>();
const inviters = new Map<string, string | undefined>();

async function snapshot(guild: Guild): Promise<Map<string, number> | null> {
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) return null;
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return null;
  const map = new Map<string, number>();
  for (const invite of invites.values()) {
    map.set(invite.code, invite.uses ?? 0);
    inviters.set(invite.code, invite.inviterId ?? undefined);
  }
  return map;
}

export async function primeInvites(guild: Guild): Promise<void> {
  const snap = await snapshot(guild);
  if (snap) uses.set(guild.id, snap);
}

export function trackInviteCreated(guildId: string, code: string, inviterId?: string): void {
  uses.get(guildId)?.set(code, 0);
  inviters.set(code, inviterId);
}

export function trackInviteDeleted(guildId: string, code: string): void {
  // Kept until the next join diff so a single-use invite consumed by that join can still be found.
  setTimeout(() => uses.get(guildId)?.delete(code), 10_000);
}

/** Works out which invite a new member used by diffing use counts. Returns null when it can't tell. */
export async function resolveUsedInvite(guild: Guild): Promise<UsedInvite | null> {
  const before = uses.get(guild.id);
  const after = await snapshot(guild);
  if (!after) return null;
  uses.set(guild.id, after);
  const code = before ? findUsedInvite(before, after) : null;
  if (code) return { code, inviterId: inviters.get(code) };
  if (guild.vanityURLCode) return { code: guild.vanityURLCode, guessed: true };
  container.logger.debug(`invite-tracker: could not resolve the invite used in ${guild.id}`);
  return null;
}
