import { EmbedBuilder, type SlashCommandSubcommandBuilder } from 'discord.js';
import type { Command } from '@sapphire/framework';
import spacetime from 'spacetime';
import { TimeTrackConfigModel, AvailabilityConfigModel } from '@bedge/database';
import type { AvailabilityWindow } from '@bedge/types';

type StoplightLevel = 'green' | 'yellow' | 'orange' | 'red';

const STOPLIGHT_LABELS: Record<StoplightLevel, string> = {
  green: '🟢 Definitely available',
  yellow: '🟡 Maybe available',
  orange: '🟠 Probably unavailable',
  red: '🔴 Unavailable',
};

const STOPLIGHT_COLORS: Record<StoplightLevel, number> = {
  green: 0x57f287,
  yellow: 0xfee75c,
  orange: 0xe67e22,
  red: 0xed4245,
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function isInWindow(currentMinutes: number, window: AvailabilityWindow): boolean {
  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);
  if (end < start) return currentMinutes >= start || currentMinutes < end;
  return currentMinutes >= start && currentMinutes < end;
}

function computeLevel(
  currentMinutes: number,
  currentDay: number,
  weekdays: Map<string, AvailabilityWindow[] | null> | Record<string, AvailabilityWindow[] | null>,
  broad: AvailabilityWindow[],
): StoplightLevel {
  const weekdayWindows =
    weekdays instanceof Map
      ? weekdays.get(String(currentDay)) ?? null
      : weekdays[String(currentDay)] ?? null;

  const layer = weekdayWindows !== null ? weekdayWindows : broad;
  for (const window of layer ?? []) {
    if (isInWindow(currentMinutes, window)) return window.level as StoplightLevel;
  }
  return 'red';
}

export function buildInfoSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return sub
    .setName('info')
    .setDescription('Show current time and availability for a tracked member')
    .addUserOption((o) =>
      o.setName('member').setDescription('The tracked member to query').setRequired(true),
    );
}

export async function handleInfo(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const targetUser = interaction.options.getUser('member', true);
  const guildId = interaction.guildId!;

  const config = await TimeTrackConfigModel.findOne({ guildId, memberId: targetUser.id });
  if (!config) {
    await interaction.editReply(`<@${targetUser.id}> is not currently tracked. Ask a server admin to run \`/time track\` first.`);
    return;
  }

  const s = spacetime.now(config.timezone);
  const meta = s.timezone();
  const off = meta.current.offset;
  const sign = off >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(off));
  const m = Math.round((Math.abs(off) - h) * 60);
  const offsetStr = m > 0 ? `UTC${sign}${h}:${m.toString().padStart(2, '0')}` : `UTC${sign}${h}`;

  const localTime = s.format('time-24') as string;
  const localDate = s.format('nice') as string;

  const avail = await AvailabilityConfigModel.findOne({ guildId, memberId: targetUser.id });
  let level: StoplightLevel = 'red';
  if (avail) {
    const currentMinutes = s.hour() * 60 + s.minute();
    const currentDay = s.day();
    level = computeLevel(currentMinutes, currentDay, avail.weekdays as any, avail.broad);
  }

  const guildMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
  const displayName = guildMember?.displayName ?? targetUser.username;

  const embed = new EmbedBuilder()
    .setColor(STOPLIGHT_COLORS[level])
    .setAuthor({ name: displayName, iconURL: targetUser.displayAvatarURL() })
    .addFields(
      { name: 'Local Time', value: localTime, inline: true },
      { name: 'Date', value: localDate, inline: true },
      { name: '​', value: '​', inline: true },
      { name: 'Timezone', value: meta.display || config.timezone, inline: true },
      { name: 'Offset', value: offsetStr, inline: true },
      { name: 'Availability', value: avail ? STOPLIGHT_LABELS[level] : '🔴 No availability config', inline: true },
    );

  // If the invoker is also tracked, show their time for easy comparison
  if (interaction.user.id !== targetUser.id) {
    const invokerConfig = await TimeTrackConfigModel.findOne({
      guildId,
      memberId: interaction.user.id,
    });
    if (invokerConfig) {
      const invokerS = spacetime.now(invokerConfig.timezone);
      embed.addFields({
        name: `Your time (${invokerConfig.alias})`,
        value: invokerS.format('time-24') as string,
        inline: false,
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
