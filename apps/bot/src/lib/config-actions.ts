import {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import type { LogCategory } from '@bedge/types';
import { getGuildConfig, updateGuildConfig, type GuildConfigData } from './guild-config.js';
import { CATEGORY_LABELS, STAR_THRESHOLDS, configId, parseConfigId, renderConfigPanel, type ConfigView } from './config-panel.js';
import { displayEmoji, parseEmojiInput } from './starboard/logic.js';
import { DEFAULT_WELCOME, WELCOME_MAX, renderWelcomeCard, renderWelcomeText } from './events/welcome.js';
import { quote } from './events/format.js';
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
      const label = action === 'role-admin' ? 'Admin' : 'Mod';
      return {
        update: setOrUnset(`roles.${action === 'role-admin' ? 'admin' : 'mod'}RoleId`, value),
        summary: value ? `${label} role set to <@&${value}>` : `${label} role cleared`,
      };
    }
    case 'welcomechannel':
      return {
        update: setOrUnset('welcome.channelId', value),
        summary: value ? `Welcome channel set to <#${value}>` : 'Welcome channel cleared',
      };
    case 'welcometoggle': {
      const enabled = !config.welcome.enabled;
      return {
        update: { $set: { 'welcome.enabled': enabled } },
        summary: `Welcome messages ${enabled ? 'enabled' : 'disabled'}`,
      };
    }
    case 'starchannel':
      return {
        update: setOrUnset('starboard.channelId', value),
        summary: value ? `Starboard channel set to <#${value}>` : 'Starboard channel cleared',
      };
    case 'startoggle': {
      const enabled = !config.starboard.enabled;
      return { update: { $set: { 'starboard.enabled': enabled } }, summary: `Starboard ${enabled ? 'enabled' : 'disabled'}` };
    }
    case 'starthreshold': {
      const threshold = Number(value);
      if (!STAR_THRESHOLDS.includes(threshold)) return null;
      return { update: { $set: { 'starboard.threshold': threshold } }, summary: `Starboard now needs ${threshold} star(s)` };
    }
    case 'starself': {
      const selfStar = !config.starboard.selfStar;
      return {
        update: { $set: { 'starboard.selfStar': selfStar } },
        summary: `Self-stars ${selfStar ? 'now count' : 'no longer count'} on the starboard`,
      };
    }
    default:
      return null;
  }
}

function starEmojiModal(config: GuildConfigData, view: ConfigView): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(configId('staremojimodal', view))
    .setTitle('Starboard emoji')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Emoji')
        .setDescription('A normal emoji like ⭐, or a custom one like <:name:123…> (type \\:name: in chat to get it)')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('emoji')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(64)
            .setRequired(true)
            .setValue(/^\d+$/.test(config.starboard.emoji) ? `:${config.starboard.emoji}` : config.starboard.emoji),
        ),
    );
}

function nextView(action: string, view: ConfigView, values: string[]): ConfigView {
  if (action === 'section') return parseConfigId(`cfg:x:${values[0]}:${view.category}`)!.view;
  if (action === 'category') return { ...view, category: values[0] as LogCategory };
  return view;
}

function welcomeModal(config: GuildConfigData, view: ConfigView): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(configId('welcomemodal', view))
    .setTitle('Welcome message')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Message')
        .setDescription('Placeholders: {user} {username} {server} {memberCount}')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('message')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(WELCOME_MAX)
            .setRequired(false)
            .setValue(config.welcome.message ?? DEFAULT_WELCOME),
        ),
    );
}

async function sendPreview(interaction: PanelInteraction, config: GuildConfigData): Promise<void> {
  const text = renderWelcomeText(config.welcome.message, {
    userId: interaction.user.id,
    username: interaction.user.username,
    server: interaction.guild.name,
    memberCount: interaction.guild.memberCount,
  });
  const card = renderWelcomeCard(text, interaction.member.displayAvatarURL(), interaction.user.id);
  await interaction.reply({ ...card, flags: card.flags | MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

export async function handleConfigInteraction(interaction: PanelInteraction): Promise<void> {
  const parsed = parseConfigId(interaction.customId);
  if (!parsed) return;
  if (!(await requireTier(interaction, 'admin'))) return;

  const { action } = parsed;
  const values = interaction.isAnySelectMenu() ? interaction.values : [];
  const view = nextView(action, parsed.view, values);
  let config = await getGuildConfig(interaction.guildId);

  if (action === 'welcomeedit') {
    await interaction.showModal(welcomeModal(config, view));
    return;
  }
  if (action === 'welcomepreview') {
    await sendPreview(interaction, config);
    return;
  }
  if (action === 'staremoji') {
    await interaction.showModal(starEmojiModal(config, view));
    return;
  }

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
  if (change) config = await updateGuildConfig(interaction.guildId, change.update);
  await interaction.update(renderConfigPanel(config, interaction.guild.name, view));
  if (change) await log(interaction.guild, 'server.config', { subject: subjectOf(interaction.member), body: change.summary });
}

export async function handleConfigModal(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
  const parsed = parseConfigId(interaction.customId);
  if (!parsed || (parsed.action !== 'welcomemodal' && parsed.action !== 'staremojimodal')) return;
  if (!(await requireTier(interaction, 'admin'))) return;

  let change: Change;
  if (parsed.action === 'welcomemodal') {
    const message = interaction.fields.getTextInputValue('message').trim();
    change = {
      update: setOrUnset('welcome.message', message || undefined),
      summary: message ? `Welcome message updated:\n${quote(message, 1400)}` : 'Welcome message reset to the default',
    };
  } else {
    const raw = interaction.fields.getTextInputValue('emoji');
    const emoji = parseEmojiInput(raw.replace(/^:(\d+)$/, '$1'));
    if (!emoji) {
      await interaction.reply({ content: `❌ \`${raw}\` isn't an emoji I can use.`, flags: MessageFlags.Ephemeral });
      return;
    }
    change = { update: { $set: { 'starboard.emoji': emoji } }, summary: `Starboard emoji set to ${displayEmoji(emoji)}` };
  }

  const config = await updateGuildConfig(interaction.guildId, change.update);
  const panel = renderConfigPanel(config, interaction.guild.name, parsed.view);
  if (interaction.isFromMessage()) await interaction.update(panel);
  else await interaction.reply({ ...panel, flags: panel.flags | MessageFlags.Ephemeral });
  await log(interaction.guild, 'server.config', { subject: subjectOf(interaction.member), body: change.summary });
}
