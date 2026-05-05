import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type SlashCommandSubcommandBuilder,
} from 'discord.js';
import type { Command } from '@sapphire/framework';
import { AvailabilityConfigModel } from '@bedge/database';
import type { AvailabilityLevel, AvailabilityWindow } from '@bedge/types';

const LEVEL_LABELS: Record<AvailabilityLevel, string> = {
  green: '🟢 Definitely available',
  yellow: '🟡 Maybe available',
  orange: '🟠 Probably unavailable',
  red: '🔴 Unavailable',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function hhmm(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function windowSummary(w: AvailabilityWindow): string {
  const overnight = w.end < w.start ? ' *(overnight)*' : '';
  return `${w.start}–${w.end} ${LEVEL_LABELS[w.level]}${overnight}`;
}

export function buildAvailabilitySubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return sub
    .setName('availability')
    .setDescription('Manage your availability windows')
    .addStringOption((o) =>
      o
        .setName('action')
        .setDescription('What to do')
        .setRequired(true)
        .addChoices(
          { name: 'add-broad', value: 'add-broad' },
          { name: 'add-weekday', value: 'add-weekday' },
          { name: 'clear-broad', value: 'clear-broad' },
          { name: 'clear-weekday', value: 'clear-weekday' },
          { name: 'clear', value: 'clear' },
          { name: 'view', value: 'view' },
        ),
    )
    .addStringOption((o) =>
      o.setName('start').setDescription('Start time in HH:mm (24h)'),
    )
    .addStringOption((o) =>
      o.setName('end').setDescription('End time in HH:mm (24h)'),
    )
    .addStringOption((o) =>
      o
        .setName('level')
        .setDescription('Availability level')
        .addChoices(
          { name: '🟢 green — Definitely available', value: 'green' },
          { name: '🟡 yellow — Maybe available', value: 'yellow' },
          { name: '🟠 orange — Probably unavailable', value: 'orange' },
          { name: '🔴 red — Unavailable', value: 'red' },
        ),
    )
    .addIntegerOption((o) =>
      o
        .setName('day')
        .setDescription('Day of week (0=Sunday … 6=Saturday)')
        .setMinValue(0)
        .setMaxValue(6),
    )
    .addUserOption((o) =>
      o.setName('member').setDescription('Member to configure (admins only; defaults to you)'),
    );
}

export async function handleAvailability(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  const action = interaction.options.getString('action', true);
  const targetUser = interaction.options.getUser('member') ?? interaction.user;
  const isSelf = targetUser.id === interaction.user.id;

  if (!isSelf && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ You need the **Manage Server** permission to configure availability for other members.',
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guildId!;
  const memberId = targetUser.id;

  switch (action) {
    case 'add-broad':
      return addWindow(interaction, guildId, memberId, 'broad', null);
    case 'add-weekday':
      return addWindow(interaction, guildId, memberId, 'weekday', interaction.options.getInteger('day'));
    case 'clear-broad':
      return clearWindows(interaction, guildId, memberId, 'broad', null);
    case 'clear-weekday':
      return clearWindows(interaction, guildId, memberId, 'weekday', interaction.options.getInteger('day'));
    case 'clear':
      return clearAll(interaction, guildId, memberId, targetUser.id);
    case 'view':
      return viewConfig(interaction, guildId, memberId, targetUser);
    default:
      await interaction.reply({ content: `Unknown action: ${action}`, ephemeral: true });
  }
}

async function addWindow(
  interaction: Command.ChatInputCommandInteraction,
  guildId: string,
  memberId: string,
  layer: 'broad' | 'weekday',
  day: number | null,
): Promise<void> {
  const start = interaction.options.getString('start');
  const end = interaction.options.getString('end');
  const level = interaction.options.getString('level') as AvailabilityLevel | null;

  if (!start || !end || !level) {
    await interaction.reply({
      content: '❌ `start`, `end`, and `level` are required for this action.',
      ephemeral: true,
    });
    return;
  }

  if (!hhmm(start) || !hhmm(end)) {
    await interaction.reply({
      content: '❌ Times must be in `HH:mm` format (24-hour), e.g. `09:00` or `21:30`.',
      ephemeral: true,
    });
    return;
  }

  if (layer === 'weekday' && day === null) {
    await interaction.reply({
      content: '❌ `day` is required for `add-weekday` (0 = Sunday, 6 = Saturday).',
      ephemeral: true,
    });
    return;
  }

  const window: AvailabilityWindow = { start, end, level };
  const isOvernight = end < start;

  const confirmText =
    layer === 'broad'
      ? `Add broad window: **${windowSummary(window)}**`
      : `Add ${DAY_NAMES[day!]} window: **${windowSummary(window)}**`;

  const overnightNote = isOvernight
    ? `\n> ℹ️ End time is earlier than start — this window extends past midnight into the next calendar day.`
    : '';

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('av-confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('av-cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
  );

  await interaction.deferReply({ ephemeral: true });
  const msg = await interaction.editReply({
    content: confirmText + overnightNote,
    components: [row],
  });

  try {
    const btn = await msg.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
    });

    if (btn.customId === 'av-cancel') {
      await btn.update({ content: 'Cancelled.', components: [] });
      return;
    }

    if (layer === 'broad') {
      await AvailabilityConfigModel.findOneAndUpdate(
        { guildId, memberId },
        { $push: { broad: window } },
        { upsert: true },
      );
    } else {
      await AvailabilityConfigModel.findOneAndUpdate(
        { guildId, memberId },
        { $push: { [`weekdays.${day}`]: window } },
        { upsert: true },
      );
    }

    await btn.update({ content: `✅ Window added.${overnightNote}`, components: [] });
  } catch {
    await interaction.editReply({ content: '⏱️ Confirmation timed out.', components: [] });
  }
}

async function clearWindows(
  interaction: Command.ChatInputCommandInteraction,
  guildId: string,
  memberId: string,
  layer: 'broad' | 'weekday',
  day: number | null,
): Promise<void> {
  if (layer === 'weekday' && day === null) {
    await interaction.reply({
      content: '❌ `day` is required for `clear-weekday`.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  if (layer === 'broad') {
    await AvailabilityConfigModel.findOneAndUpdate(
      { guildId, memberId },
      { $set: { broad: [] } },
    );
    await interaction.editReply('✅ Broad availability windows cleared.');
  } else {
    await AvailabilityConfigModel.findOneAndUpdate(
      { guildId, memberId },
      { $unset: { [`weekdays.${day}`]: '' } },
    );
    await interaction.editReply(`✅ ${DAY_NAMES[day!]} availability windows cleared.`);
  }
}

async function clearAll(
  interaction: Command.ChatInputCommandInteraction,
  guildId: string,
  memberId: string,
  userId: string,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  await AvailabilityConfigModel.deleteOne({ guildId, memberId });
  await interaction.editReply(`✅ Removed all availability config for <@${userId}>.`);
}

async function viewConfig(
  interaction: Command.ChatInputCommandInteraction,
  guildId: string,
  memberId: string,
  targetUser: { id: string; displayName?: string; username: string },
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const config = await AvailabilityConfigModel.findOne({ guildId, memberId });
  if (!config) {
    await interaction.editReply(`No availability config set for <@${targetUser.id}>.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Availability — ${targetUser.username}`)
    .setColor(0x5865f2);

  if (config.broad.length > 0) {
    embed.addFields({
      name: 'Broad',
      value: config.broad.map(windowSummary).join('\n'),
    });
  } else {
    embed.addFields({ name: 'Broad', value: 'None configured' });
  }

  const weekdayMap = config.weekdays instanceof Map ? config.weekdays : new Map(Object.entries(config.weekdays ?? {}));
  for (let d = 0; d < 7; d++) {
    const windows = weekdayMap.get(String(d));
    if (windows && windows.length > 0) {
      embed.addFields({
        name: DAY_NAMES[d],
        value: windows.map(windowSummary).join('\n'),
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
