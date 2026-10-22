import type { ModCaseType } from '@bedge/types';
import { container } from '@sapphire/framework';
import {
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type UserContextMenuCommandInteraction,
  type ModalSubmitInteraction,
  type RepliableInteraction,
} from 'discord.js';
import { TIER_LABELS, tierAtLeast, type Tier } from '../permissions.js';
import { tierInGuild } from '../tier-check.js';
import { performModAction, type ModActionResult } from './actions.js';
import { parseModButtonId, parseModalId } from './buttons.js';
import { countCases, listCases } from './cases.js';
import { actionModal, renderLookup, renderModeratePanel } from './panels.js';
import { ACTION_TIER, CASE_LABELS, parseModDuration } from './rules.js';

const MODAL_TYPES = new Set<ModCaseType>(['note', 'warn', 'timeout', 'kick', 'ban']);

async function deny(interaction: RepliableInteraction, content: string): Promise<void> {
  await interaction.reply({ content: `❌ ${content}`, flags: MessageFlags.Ephemeral });
}

async function gate(interaction: RepliableInteraction, guildId: string, required: Tier): Promise<Tier | null> {
  const tier = await tierInGuild(interaction.user.id, guildId);
  if (tierAtLeast(tier, required)) return tier;
  await deny(interaction, `This needs the **${TIER_LABELS[required]}** tier in that server.`);
  return null;
}

export async function replyLookup(interaction: RepliableInteraction, guildId: string, userId: string): Promise<void> {
  const actorTier = await gate(interaction, guildId, 'mod');
  if (!actorTier) return;
  const guild = container.client.guilds.cache.get(guildId);
  const user = await container.client.users.fetch(userId).catch(() => null);
  if (!guild || !user) return deny(interaction, 'That server or user is no longer available.');

  const [member, recent, counts] = await Promise.all([
    guild.members.fetch(userId).catch(() => null),
    listCases(guildId, userId, 10),
    countCases(guildId, userId),
  ]);
  await interaction.reply(renderLookup({ guildId, guildName: guild.name, user, member, counts, recent, actorTier }));
}

export async function replyModeratePanel(interaction: RepliableInteraction, guildId: string, userId: string): Promise<void> {
  const actorTier = await gate(interaction, guildId, 'mod');
  if (!actorTier) return;
  const user = await container.client.users.fetch(userId).catch(() => null);
  if (!user) return deny(interaction, 'I could not find that user.');
  await interaction.reply(renderModeratePanel(guildId, user, actorTier));
}

type ModalOpener = ButtonInteraction | ChatInputCommandInteraction | UserContextMenuCommandInteraction;

export async function showActionModalFor(
  interaction: ModalOpener,
  type: ModCaseType,
  guildId: string,
  userId: string,
): Promise<void> {
  if (!(await gate(interaction, guildId, ACTION_TIER[type]))) return;
  const user = await container.client.users.fetch(userId).catch(() => null);
  if (!user) return deny(interaction, 'I could not find that user.');
  await interaction.showModal(actionModal(type, guildId, user));
}

export async function handleModButton(interaction: ButtonInteraction): Promise<void> {
  const parsed = parseModButtonId(interaction.customId);
  if (!parsed) return;
  const { action, guildId, userId } = parsed;
  if (action === 'lookup') return replyLookup(interaction, guildId, userId);
  if (action === 'moderate') return replyModeratePanel(interaction, guildId, userId);
  if (MODAL_TYPES.has(action as ModCaseType)) return showActionModalFor(interaction, action as ModCaseType, guildId, userId);
}

export function describeResult(result: ModActionResult, type: ModCaseType, targetId: string): string {
  if (!result.ok) return `❌ ${result.error}`;
  const { emoji, past } = CASE_LABELS[type];
  const dm = type === 'note' ? '' : result.dmSent ? ' They were notified by DM.' : ' (DM not delivered.)';
  return `${emoji} Case **#${result.modCase.caseNumber}** — <@${targetId}> ${past}.${dm}`;
}

export async function handleModModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parsed = parseModalId(interaction.customId);
  if (!parsed || !MODAL_TYPES.has(parsed.type as ModCaseType)) return;
  const type = parsed.type as ModCaseType;
  const actorTier = await gate(interaction, parsed.guildId, ACTION_TIER[type]);
  if (!actorTier) return;
  const guild = container.client.guilds.cache.get(parsed.guildId);
  if (!guild) return deny(interaction, 'That server is no longer available.');

  let durationMs: number | undefined;
  if (type === 'timeout') {
    durationMs = parseModDuration(interaction.fields.getTextInputValue('duration')) ?? undefined;
    if (!durationMs) return deny(interaction, 'Invalid duration. Use formats like `10m`, `2h` or `7d`.');
  }
  const deleteMessageSeconds = type === 'ban' ? Number(interaction.fields.getStringSelectValues('delete')[0] ?? 0) : undefined;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await performModAction({
    guild,
    type,
    targetId: parsed.userId,
    moderator: interaction.user,
    actorTier,
    reason: interaction.fields.getTextInputValue('reason').trim(),
    durationMs,
    deleteMessageSeconds,
  });
  await interaction.editReply({ content: describeResult(result, type, parsed.userId), allowedMentions: { parse: [] } });
}
