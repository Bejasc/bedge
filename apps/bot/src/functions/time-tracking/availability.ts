import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import type { SapphireClient } from '@sapphire/framework';
import { AvailabilityConfigModel } from '@bedge/database';
import type { AvailabilityConfigDocument } from '@bedge/database';
import type { AvailabilityLevel, AvailabilityWindow } from '@bedge/types';
import { LEVEL_LABELS, parseDuration, timeToMinutes } from '../../lib/availability.js';
import { updateMemberTimeChannel } from '../../jobs/update-time-channels.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HHMM = /^\d{2}:\d{2}$/;

// Two windows overlap if they share any minute. Touching boundaries (end == other start) is not an overlap.
function windowsOverlap(a: AvailabilityWindow, b: AvailabilityWindow): boolean {
  const aS = timeToMinutes(a.start);
  const aE = timeToMinutes(a.end);
  const bS = timeToMinutes(b.start);
  const bE = timeToMinutes(b.end);
  const aOvernight = aE < aS;
  const bOvernight = bE < bS;

  if (!aOvernight && !bOvernight) {
    return aS < bE && bS < aE;
  }
  if (aOvernight && !bOvernight) {
    // A covers [aS, 1440) ∪ [0, aE)
    return aS < bE || bS < aE;
  }
  if (!aOvernight && bOvernight) {
    // B covers [bS, 1440) ∪ [0, bE)
    return bS < aE || aS < bE;
  }
  // Both overnight — both cross midnight, always share some time
  return true;
}

function getExistingWindows(config: AvailabilityConfigDocument | null, day: string): AvailabilityWindow[] {
  if (!config) return [];
  if (day === 'broad') return [...(config.broad ?? [])];
  const map = config.weekdays instanceof Map ? config.weekdays : new Map(Object.entries(config.weekdays ?? {}));
  return [...(map.get(day) ?? [])];
}

async function saveWindows(
  guildId: string,
  memberId: string,
  day: string,
  windows: AvailabilityWindow[],
): Promise<void> {
  const field = day === 'broad' ? 'broad' : `weekdays.${day}`;
  await AvailabilityConfigModel.findOneAndUpdate(
    { guildId, memberId },
    { $set: { [field]: windows } },
    { upsert: true },
  );
}

async function resolveTarget(
  interaction: Command.ChatInputCommandInteraction,
): Promise<{ targetUser: { id: string; username: string }; allowed: boolean }> {
  const targetUser = interaction.options.getUser('member') ?? interaction.user;
  const isSelf = targetUser.id === interaction.user.id;

  if (!isSelf && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ You need the **Manage Server** permission to configure availability for other members.',
      ephemeral: true,
    });
    return { targetUser, allowed: false };
  }

  return { targetUser, allowed: true };
}

export async function handleAvailabilityView(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  const { targetUser, allowed } = await resolveTarget(interaction);
  if (!allowed) return;

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;
  const memberId = targetUser.id;
  const config = await AvailabilityConfigModel.findOne({ guildId, memberId });

  container.logger.debug(`availability view: member=${memberId} hasConfig=${!!config}`);

  if (!config) {
    await interaction.editReply({
      content: [
        `No custom availability configured for <@${memberId}>. **Default rules apply:**`,
        '- `00:00–08:00` → 🔴 Unavailable',
        '- `08:00–18:00` Mon–Fri → 🟠 Probably unavailable',
        '- All other times → 🟡 Maybe available',
        '',
        'Use `/availability set` to configure custom windows.',
      ].join('\n'),
    });
    return;
  }

  const jsonObj = {
    broad: config.broad,
    weekdays: Object.fromEntries(
      config.weekdays instanceof Map
        ? config.weekdays.entries()
        : Object.entries(config.weekdays ?? {}),
    ),
  };

  const jsonStr = JSON.stringify(jsonObj, null, 2);
  let content = `**Availability config for <@${memberId}>** *(times are in their local timezone — days: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat)*\n\`\`\`json\n${jsonStr}\n\`\`\``;

  if (config.override) {
    const now = new Date();
    if (config.override.expiresAt > now) {
      const unixTs = Math.floor(config.override.expiresAt.getTime() / 1000);
      const label = LEVEL_LABELS[config.override.level as AvailabilityLevel];
      content += `\n**Active override:** ${label} until <t:${unixTs}:t> (<t:${unixTs}:R>)`;
      container.logger.debug(`availability view: member=${memberId} has active override level=${config.override.level} expires=${config.override.expiresAt.toISOString()}`);
    } else {
      container.logger.debug(`availability view: member=${memberId} override expired at ${config.override.expiresAt.toISOString()}`);
    }
  }

  await interaction.editReply({ content });
}

export async function handleAvailabilitySet(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  const { targetUser, allowed } = await resolveTarget(interaction);
  if (!allowed) return;

  const day = interaction.options.getString('day', true);
  const start = interaction.options.getString('start', true);
  const end = interaction.options.getString('end', true);
  const status = interaction.options.getString('status', true) as AvailabilityLevel;

  if (!HHMM.test(start) || !HHMM.test(end)) {
    await interaction.reply({
      content: '❌ Times must be in `HH:mm` format (24-hour), e.g. `09:00` or `21:30`.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;
  const memberId = targetUser.id;
  const newWindow: AvailabilityWindow = { start, end, level: status };
  const isOvernight = end < start;
  const dayLabel = day === 'broad' ? 'every day' : DAY_NAMES[parseInt(day)];
  const overnightNote = isOvernight ? '\n> ℹ️ End time is before start — this window wraps past midnight.' : '';

  const config = await AvailabilityConfigModel.findOne({ guildId, memberId });
  const existing = getExistingWindows(config, day);
  const overlapping = existing.filter((w) => windowsOverlap(newWindow, w));

  container.logger.debug(
    `availability set: member=${memberId} day=${day} ${start}–${end} ${status} — ${existing.length} existing, ${overlapping.length} overlapping`,
  );

  if (overlapping.length > 0) {
    const overlapList = overlapping
      .map((w) => `• \`${w.start}–${w.end}\` ${LEVEL_LABELS[w.level as AvailabilityLevel]}`)
      .join('\n');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('av-confirm').setLabel('Replace').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('av-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const msg = await interaction.editReply({
      content: `The new window **\`${start}–${end}\`** ${LEVEL_LABELS[status]} overlaps with the following on **${dayLabel}**:\n${overlapList}\n\nConfirm to replace the overlapping window(s) and add the new one.${overnightNote}`,
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

      const kept = existing.filter((w) => !windowsOverlap(newWindow, w));
      await saveWindows(guildId, memberId, day, [...kept, newWindow]);

      container.logger.debug(
        `availability set: member=${memberId} day=${day} replaced ${overlapping.length} window(s) → ${start}–${end} ${status}`,
      );

      await btn.update({
        content: `✅ **${dayLabel}** for <@${memberId}>: replaced ${overlapping.length} window(s) with **\`${start}–${end}\`** ${LEVEL_LABELS[status]}.${overnightNote}`,
        components: [],
      });
    } catch {
      await interaction.editReply({ content: '⏱️ Confirmation timed out.', components: [] });
    }
    return;
  }

  // No overlap — append directly
  await saveWindows(guildId, memberId, day, [...existing, newWindow]);

  container.logger.debug(
    `availability set: member=${memberId} day=${day} appended ${start}–${end} ${status}`,
  );

  await interaction.editReply(
    `✅ **${dayLabel}** for <@${memberId}>: added **\`${start}–${end}\`** ${LEVEL_LABELS[status]}.${overnightNote}`,
  );
}

export async function handleAvailabilityAdvanced(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  const { targetUser, allowed } = await resolveTarget(interaction);
  if (!allowed) return;

  const guildId = interaction.guildId!;
  const memberId = targetUser.id;
  const config = await AvailabilityConfigModel.findOne({ guildId, memberId });

  const jsonObj = config
    ? {
        broad: config.broad,
        weekdays: Object.fromEntries(
          config.weekdays instanceof Map
            ? config.weekdays.entries()
            : Object.entries(config.weekdays ?? {}),
        ),
      }
    : { broad: [], weekdays: {} };

  container.logger.debug(`availability advanced: showing modal for member=${memberId} hasExistingConfig=${!!config}`);

  const modal = new ModalBuilder()
    .setCustomId(`availability-advanced:${memberId}:${guildId}`)
    .setTitle('Set Availability Config')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('json')
          .setLabel('JSON config (local tz — 0=Sun … 6=Sat)')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(JSON.stringify(jsonObj, null, 2))
          .setRequired(true),
      ),
    );

  await interaction.showModal(modal);
}

export async function handleAvailabilityReset(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  const { targetUser, allowed } = await resolveTarget(interaction);
  if (!allowed) return;

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;
  const memberId = targetUser.id;

  await AvailabilityConfigModel.deleteOne({ guildId, memberId });

  container.logger.debug(`availability reset: cleared config for member=${memberId} guild=${guildId}`);
  await interaction.editReply(`✅ Availability config cleared for <@${memberId}>. Default rules now apply.`);
}

export async function handleAvailabilityOverride(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  const { targetUser, allowed } = await resolveTarget(interaction);
  if (!allowed) return;

  const status = interaction.options.getString('status', true) as AvailabilityLevel;
  const durationStr = interaction.options.getString('duration', true);

  const durationMs = parseDuration(durationStr);
  if (durationMs === null) {
    await interaction.reply({
      content: '❌ Invalid duration. Use formats like `3h`, `30m`, or `1h30m`.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;
  const memberId = targetUser.id;
  const expiresAt = new Date(Date.now() + durationMs);
  const expiresUnix = Math.floor(expiresAt.getTime() / 1000);

  await AvailabilityConfigModel.findOneAndUpdate(
    { guildId, memberId },
    { $set: { override: { level: status, expiresAt } } },
    { upsert: true },
  );

  container.logger.debug(
    `availability override: member=${memberId} status=${status} durationMs=${durationMs} expires=${expiresAt.toISOString()}`,
  );

  updateMemberTimeChannel(interaction.client as SapphireClient, guildId, memberId).catch((err: unknown) => {
    container.logger.warn(`availability override: immediate channel update failed for member=${memberId} — ${String(err)}`);
  });

  await interaction.editReply(
    `✅ Availability for <@${memberId}> set to **${LEVEL_LABELS[status]}** until <t:${expiresUnix}:t> (<t:${expiresUnix}:R>).`,
  );
}
