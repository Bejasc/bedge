import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { AvailabilityConfigModel } from '@bedge/database';
import type { AvailabilityLevel } from '@bedge/types';
import { LEVEL_LABELS, parseDuration } from '../../lib/availability.js';

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

  container.logger.debug(`availability set: showing modal for member=${memberId} hasExistingConfig=${!!config}`);

  const modal = new ModalBuilder()
    .setCustomId(`availability-set:${memberId}:${guildId}`)
    .setTitle('Set Availability Config')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('json')
          .setLabel('JSON (times in local timezone, days 0=Sun…6=Sat)')
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

  await interaction.editReply(
    `✅ Availability for <@${memberId}> set to **${LEVEL_LABELS[status]}** until <t:${expiresUnix}:t> (<t:${expiresUnix}:R>).`,
  );
}
