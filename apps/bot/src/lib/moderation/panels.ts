import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
  type GuildMember,
  type User,
} from 'discord.js';
import type { ModCaseType } from '@bedge/types';
import { BRAND_COLOUR, brandFooter } from '../brand.js';
import { discordTime, formatDuration } from '../events/format.js';
import { tierAtLeast, type Tier } from '../permissions.js';
import { modButtonId, modalId, type ModButtonAction } from './buttons.js';
import { ACTION_TIER, CASE_LABELS, formatCaseLine } from './rules.js';

const ACTIONS: { action: ModButtonAction; type: ModCaseType; style: ButtonStyle }[] = [
  { action: 'warn', type: 'warn', style: ButtonStyle.Secondary },
  { action: 'timeout', type: 'timeout', style: ButtonStyle.Secondary },
  { action: 'kick', type: 'kick', style: ButtonStyle.Danger },
  { action: 'ban', type: 'ban', style: ButtonStyle.Danger },
];

const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

/** Note plus whichever of Warn / Timeout / Kick / Ban the actor's tier allows. */
export function actionButtons(guildId: string, userId: string, actorTier: Tier): ActionRowBuilder<ButtonBuilder> {
  const buttons = [
    new ButtonBuilder().setCustomId(modButtonId('note', guildId, userId)).setStyle(ButtonStyle.Secondary).setLabel('Note').setEmoji('📝'),
    ...ACTIONS.filter((a) => tierAtLeast(actorTier, ACTION_TIER[a.type])).map((a) =>
      new ButtonBuilder()
        .setCustomId(modButtonId(a.action, guildId, userId))
        .setStyle(a.style)
        .setLabel(CASE_LABELS[a.type].label)
        .setEmoji(CASE_LABELS[a.type].emoji),
    ),
  ];
  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

export interface LookupData {
  guildId: string;
  guildName: string;
  user: User;
  member: GuildMember | null;
  counts: Partial<Record<ModCaseType, number>>;
  recent: { caseNumber: number; type: ModCaseType; reason: string; createdAt: Date; moderatorId: string }[];
  actorTier: Tier;
}

export function renderLookup(d: LookupData) {
  const lines = [
    `### 🔎 ${d.user.username}`,
    `<@${d.user.id}> • \`${d.user.id}\``,
    `**Account created:** ${discordTime(d.user.createdTimestamp, 'D')} (${formatDuration(Date.now() - d.user.createdTimestamp)} ago)`,
  ];
  if (d.member) {
    if (d.member.joinedTimestamp) lines.push(`**Joined:** ${discordTime(d.member.joinedTimestamp, 'D')}`);
    const timeoutUntil = d.member.communicationDisabledUntilTimestamp;
    if (timeoutUntil && timeoutUntil > Date.now()) lines.push(`**Timed out until:** ${discordTime(timeoutUntil)}`);
  } else {
    lines.push(`-# Not a member of ${d.guildName}`);
  }

  const roles = d.member?.roles.cache.filter((r) => r.id !== d.guildId).map((r) => `<@&${r.id}>`) ?? [];
  const counts = (Object.keys(CASE_LABELS) as ModCaseType[])
    .filter((t) => d.counts[t])
    .map((t) => `${CASE_LABELS[t].emoji} ${CASE_LABELS[t].label} **${d.counts[t]}**`);

  const container = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(d.user.displayAvatarURL())),
    );
  if (roles.length) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Roles:** ${roles.slice(0, 20).join(' ')}`));
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**History in ${d.guildName}:** ${counts.length ? counts.join(' · ') : 'clean'}`,
          ...d.recent.map(formatCaseLine),
        ].join('\n'),
      ),
    )
    .addActionRowComponents(actionButtons(d.guildId, d.user.id, d.actorTier))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(brandFooter()));

  return { components: [container], flags: ephemeralV2, allowedMentions: { parse: [] as [] } };
}

export function renderModeratePanel(guildId: string, user: User, actorTier: Tier) {
  const container = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🛡️ Moderate ${user.username}\n-# Pick an action; you'll be asked for a reason.`))
    .addActionRowComponents(actionButtons(guildId, user.id, actorTier));
  return { components: [container], flags: ephemeralV2, allowedMentions: { parse: [] as [] } };
}

export const DELETE_MESSAGE_CHOICES = [
  { label: "Don't delete messages", value: '0' },
  { label: 'Last hour', value: String(60 * 60) },
  { label: 'Last 24 hours', value: String(24 * 60 * 60) },
  { label: 'Last 7 days', value: String(7 * 24 * 60 * 60) },
];

export function actionModal(type: ModCaseType, guildId: string, user: User): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(modalId(type, guildId, user.id))
    .setTitle(`${CASE_LABELS[type].label} ${user.username}`.slice(0, 45))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(type === 'note' ? 'Note' : 'Reason')
        .setTextInputComponent(
          new TextInputBuilder().setCustomId('reason').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true),
        ),
    );
  if (type === 'timeout') {
    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel('Duration')
        .setDescription('e.g. 10m, 2h, 7d (max 28d)')
        .setTextInputComponent(new TextInputBuilder().setCustomId('duration').setStyle(TextInputStyle.Short).setRequired(true).setValue('1h')),
    );
  }
  if (type === 'ban') {
    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel('Delete recent messages')
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId('delete')
            .addOptions(DELETE_MESSAGE_CHOICES.map((c, i) => ({ ...c, default: i === 0 }))),
        ),
    );
  }
  return modal;
}
