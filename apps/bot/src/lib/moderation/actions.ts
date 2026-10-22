import type { ModCaseDocument } from '@bedge/database';
import type { ModCaseType } from '@bedge/types';
import { container } from '@sapphire/framework';
import type { Guild, GuildMember, User } from 'discord.js';
import { config } from '../../config.js';
import { discordTime } from '../events/format.js';
import { getGuildConfig } from '../guild-config.js';
import { log } from '../logs/router.js';
import { subjectOf } from '../logs/subject.js';
import type { LogField } from '../logs/types.js';
import { TIER_LABELS, resolveTier, tierAtLeast, tierSubjectFromMember, type Tier } from '../permissions.js';
import { moderationButtons } from './buttons.js';
import { createCase, setCaseLogUrl } from './cases.js';
import { markPending } from './pending.js';
import { ACTION_TIER, CASE_LABELS, CASE_LOG_KEY, MAX_TIMEOUT_MS, checkTarget, dmText } from './rules.js';

export interface ModActionInput {
  guild: Guild;
  type: ModCaseType;
  targetId: string;
  moderator: User;
  actorTier: Tier;
  reason: string;
  durationMs?: number;
  deleteMessageSeconds?: number;
}

export type ModActionResult =
  | { ok: true; modCase: ModCaseDocument; dmSent: boolean }
  | { ok: false; error: string };

async function tierOfMember(member: GuildMember): Promise<Tier> {
  const guildConfig = await getGuildConfig(member.guild.id);
  return resolveTier(tierSubjectFromMember(member), guildConfig.roles, config.ownerId);
}

function capabilityError(type: ModCaseType, member: GuildMember | null): string | null {
  const needsMember = type === 'timeout' || type === 'untimeout' || type === 'kick';
  if (needsMember && !member) return 'That user is not a member of this server.';
  if (!member) return null;
  if ((type === 'timeout' || type === 'untimeout') && !member.moderatable) return "I can't time out that member — check my role position and *Timeout Members* permission.";
  if (type === 'kick' && !member.kickable) return "I can't kick that member — check my role position and *Kick Members* permission.";
  if (type === 'ban' && !member.bannable) return "I can't ban that member — check my role position and *Ban Members* permission.";
  return null;
}

async function sendDm(user: User | null, text: string | null): Promise<boolean> {
  if (!user || !text) return false;
  return user.send(text).then(() => true, () => false);
}

/** Posts the case log (with action buttons) and stores its URL on the case. */
export async function logCase(guild: Guild, modCase: ModCaseDocument, target: User | null): Promise<void> {
  const fields: LogField[] = [
    { name: 'Case', value: `#${modCase.caseNumber}` },
    { name: 'Moderator', value: `<@${modCase.moderatorId}>` },
    { name: 'Reason', value: modCase.reason },
  ];
  if (modCase.expiresAt) fields.push({ name: 'Until', value: `${discordTime(modCase.expiresAt)} (${discordTime(modCase.expiresAt, 'R')})` });
  if (modCase.source === 'audit') fields.push({ name: 'Source', value: 'Detected from the audit log' });

  const result = await log(guild, CASE_LOG_KEY[modCase.type], {
    subject: target ? subjectOf(target) : { id: modCase.targetId, label: modCase.targetId },
    fields,
    actions: moderationButtons(guild.id, modCase.targetId),
  });
  const url = result.local?.url ?? result.mirror?.url;
  if (url) await setCaseLogUrl(modCase._id, url);
}

export async function performModAction(input: ModActionInput): Promise<ModActionResult> {
  const { guild, type, targetId, moderator, actorTier, reason } = input;
  const required = ACTION_TIER[type];
  if (!tierAtLeast(actorTier, required)) return { ok: false, error: `${CASE_LABELS[type].label} needs the **${TIER_LABELS[required]}** tier.` };

  const member = await guild.members.fetch(targetId).catch(() => null);
  const target = member?.user ?? (await container.client.users.fetch(targetId).catch(() => null));
  if (!target) return { ok: false, error: 'I could not find that user.' };

  const targetTier = member ? await tierOfMember(member) : targetId === config.ownerId ? 'owner' : null;
  const blocked =
    checkTarget({ actorId: moderator.id, actorTier, targetId, targetTier, botId: container.client.user!.id }) ??
    capabilityError(type, member);
  if (blocked) return { ok: false, error: blocked };

  let expiresAt: Date | undefined;
  if (type === 'timeout') {
    if (!input.durationMs || input.durationMs > MAX_TIMEOUT_MS) return { ok: false, error: 'Timeouts need a duration between 1 second and 28 days.' };
    expiresAt = new Date(Date.now() + input.durationMs);
  }

  const auditReason = `${moderator.username}: ${reason}`.slice(0, 512);
  const dm = dmText(type, guild.name, reason, expiresAt);
  // Kicked or banned members can no longer receive DMs from the bot, so they hear first.
  const dmFirst = type === 'kick' || type === 'ban';
  let dmSent = dmFirst ? await sendDm(target, dm) : false;

  if (type !== 'note' && type !== 'warn') markPending(guild.id, targetId, type);
  try {
    switch (type) {
      case 'timeout':
        await member!.timeout(input.durationMs!, auditReason);
        break;
      case 'untimeout':
        await member!.timeout(null, auditReason);
        break;
      case 'kick':
        await member!.kick(auditReason);
        break;
      case 'ban':
        await guild.bans.create(targetId, { reason: auditReason, deleteMessageSeconds: input.deleteMessageSeconds ?? 0 });
        break;
      case 'unban':
        await guild.bans.remove(targetId, auditReason);
        break;
      default:
        break;
    }
  } catch (error) {
    container.logger.warn(`moderation: ${type} on ${targetId} in ${guild.id} failed — ${String(error)}`);
    return { ok: false, error: `Discord rejected the ${CASE_LABELS[type].label.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (!dmFirst) dmSent = await sendDm(target, dm);

  const modCase = await createCase({ guildId: guild.id, type, targetId, moderatorId: moderator.id, reason, expiresAt, source: 'bot' });
  await logCase(guild, modCase, target);
  return { ok: true, modCase, dmSent };
}
