import type { AnySelectMenuInteraction, ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import type { LogCategory } from '@bedge/types';
import { getGuildConfig, updateGuildConfig, type GuildConfigData } from './guild-config.js';
import { CATEGORY_LABELS, parseConfigId, renderConfigPanel, type ConfigView } from './config-panel.js';
import { log } from './logs/router.js';
import { subjectOf } from './logs/subject.js';
import { requireTier } from './tier-check.js';

type PanelInteraction = ButtonInteraction<'cached'> | AnySelectMenuInteraction<'cached'>;

interface Change {
  update: { $set?: Record<string, unknown>; $unset?: Record<string, ''> };
  summary: string;
}

const setOrUnset = (path: string, value: string | undefined): Change['update'] =>
  value ? { $set: { [path]: value } } : { $unset: { [path]: '' } };

function changeFor(action: string, view: ConfigView, values: string[], config: GuildConfigData): Change | null {
  const value = values[0];
  const category: LogCategory = view.category;
  switch (action) {
    case 'default':
      return {
        update: setOrUnset('defaultLogChannelId', value),
        summary: value ? `Default log channel set to <#${value}>` : 'Default log channel cleared',
      };
    case 'catchannel':
      return {
        update: setOrUnset(`logs.${category}.channelId`, value),
        summary: value
          ? `**${CATEGORY_LABELS[category]}** logs now go to <#${value}>`
          : `**${CATEGORY_LABELS[category]}** logs now use the default channel`,
      };
    case 'toggle': {
      const enabled = !config.logs[category].enabled;
      return {
        update: { $set: { [`logs.${category}.enabled`]: enabled } },
        summary: `**${CATEGORY_LABELS[category]}** logs ${enabled ? 'enabled' : 'disabled'}`,
      };
    }
    case 'role-admin':
    case 'role-mod': {
      const tier = action === 'role-admin' ? 'admin' : 'mod';
      return {
        update: setOrUnset(`roles.${tier}RoleId`, value),
        summary: value ? `${tier === 'admin' ? 'Admin' : 'Mod'} role set to <@&${value}>` : `${tier === 'admin' ? 'Admin' : 'Mod'} role cleared`,
      };
    }
    default:
      return null;
  }
}

function nextView(action: string, view: ConfigView, values: string[]): ConfigView {
  if (action === 'section') return { ...view, section: values[0] === 'roles' ? 'roles' : 'logging' };
  if (action === 'category') return { ...view, category: values[0] as LogCategory };
  return view;
}

export async function handleConfigInteraction(interaction: PanelInteraction): Promise<void> {
  const parsed = parseConfigId(interaction.customId);
  if (!parsed) return;
  if (!(await requireTier(interaction, 'admin'))) return;

  const { action } = parsed;
  const values = interaction.isAnySelectMenu() ? interaction.values : [];
  const view = nextView(action, parsed.view, values);
  let config = await getGuildConfig(interaction.guildId);

  if (action === 'test') {
    const result = await log(interaction.guild, 'test', {
      subject: subjectOf(interaction.member),
      body: 'If you can read this, routing works. 🎉',
      fields: [{ name: 'Requested from', value: `<#${interaction.channelId}>` }],
      links: interaction.channel ? [{ label: 'Jump to context', url: interaction.channel.url }] : [],
    });
    await interaction.update(renderConfigPanel(config, interaction.guild.name, view));
    const where = [
      result.local ? `local: ${result.local.url}` : 'local: skipped (category disabled or no channel)',
      result.mirror ? `admin mirror: ${result.mirror.url}` : 'admin mirror: not sent',
    ];
    await interaction.followUp({ content: `🧪 Test log sent — ${where.join(' · ')}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const change = changeFor(action, view, values, config);
  if (change) {
    config = await updateGuildConfig(interaction.guildId, change.update);
  }
  await interaction.update(renderConfigPanel(config, interaction.guild.name, view));

  if (change) {
    await log(interaction.guild, 'server.config', {
      subject: subjectOf(interaction.member),
      body: change.summary,
    });
  }
}
