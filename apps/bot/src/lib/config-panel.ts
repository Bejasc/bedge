import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  RoleSelectMenuBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { LOG_CATEGORIES, type LogCategory } from '@bedge/types';
import { BRAND_COLOUR, brandFooter } from './brand.js';
import type { GuildConfigData } from './guild-config.js';
import { DEFAULT_WELCOME } from './events/welcome.js';
import { quote } from './events/format.js';
import { displayEmoji } from './starboard/logic.js';

export type ConfigSection = 'logging' | 'roles' | 'welcome' | 'starboard' | 'games';

export interface ConfigView {
  section: ConfigSection;
  category: LogCategory;
}

export const DEFAULT_VIEW: ConfigView = { section: 'logging', category: 'messages' };

export const CATEGORY_LABELS: Record<LogCategory, string> = {
  messages: 'Messages',
  members: 'Members',
  moderation: 'Moderation',
  voice: 'Voice',
  server: 'Server',
};

const SECTION_LABELS: Record<ConfigSection, string> = {
  logging: 'Logging',
  roles: 'Roles',
  welcome: 'Welcome',
  starboard: 'Starboard',
  games: 'Games',
};

export const LOG_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement] as const;

/** Custom IDs carry the view so every interaction can re-render the same panel. Format: `cfg:<action>:<section>:<category>`. */
export function configId(action: string, view: ConfigView): string {
  return `cfg:${action}:${view.section}:${view.category}`;
}

export function parseConfigId(customId: string): { action: string; view: ConfigView } | null {
  const [prefix, action, section, category] = customId.split(':');
  if (prefix !== 'cfg' || !action) return null;
  const view: ConfigView = {
    section: Object.hasOwn(SECTION_LABELS, section ?? '') ? (section as ConfigSection) : 'logging',
    category: (LOG_CATEGORIES as readonly string[]).includes(category) ? (category as LogCategory) : 'messages',
  };
  return { action, view };
}

const channel = (id?: string) => (id ? `<#${id}>` : '*not set*');
const role = (id?: string) => (id ? `<@&${id}>` : '*not set*');

export function describeCategory(config: GuildConfigData, category: LogCategory): string {
  const c = config.logs[category];
  const label = CATEGORY_LABELS[category];
  if (!c.enabled) return `⛔ **${label}** — disabled`;
  if (c.channelId) return `✅ **${label}** → <#${c.channelId}>`;
  if (config.defaultLogChannelId) return `✅ **${label}** → <#${config.defaultLogChannelId}> *(default)*`;
  return `⚠️ **${label}** — no channel`;
}

function sectionSelect(view: ConfigView): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(configId('section', view))
      .addOptions(
        (Object.keys(SECTION_LABELS) as ConfigSection[]).map((s) => ({
          label: SECTION_LABELS[s],
          value: s,
          default: s === view.section,
        })),
      ),
  );
}

function loggingSection(container: ContainerBuilder, config: GuildConfigData, view: ConfigView): void {
  const current = config.logs[view.category];
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [`**Default log channel:** ${channel(config.defaultLogChannelId)}`, ...LOG_CATEGORIES.map((c) => describeCategory(config, c))].join('\n'),
    ),
  );
  const defaultSelect = new ChannelSelectMenuBuilder()
    .setCustomId(configId('default', view))
    .setPlaceholder('Default log channel')
    .setChannelTypes(...LOG_CHANNEL_TYPES)
    .setMinValues(0)
    .setMaxValues(1);
  if (config.defaultLogChannelId) defaultSelect.setDefaultChannels(config.defaultLogChannelId);

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId(configId('category', view))
    .addOptions(LOG_CATEGORIES.map((c) => ({ label: `Edit: ${CATEGORY_LABELS[c]}`, value: c, default: c === view.category })));

  const categoryChannel = new ChannelSelectMenuBuilder()
    .setCustomId(configId('catchannel', view))
    .setPlaceholder(`${CATEGORY_LABELS[view.category]} log channel (blank = default)`)
    .setChannelTypes(...LOG_CHANNEL_TYPES)
    .setMinValues(0)
    .setMaxValues(1);
  if (current.channelId) categoryChannel.setDefaultChannels(current.channelId);

  container
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Default channel'))
    .addActionRowComponents(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(defaultSelect))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect))
    .addActionRowComponents(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(categoryChannel))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(configId('toggle', view))
          .setStyle(current.enabled ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setLabel(current.enabled ? `Disable ${CATEGORY_LABELS[view.category]}` : `Enable ${CATEGORY_LABELS[view.category]}`),
        new ButtonBuilder().setCustomId(configId('test', view)).setStyle(ButtonStyle.Primary).setLabel('Send test log'),
      ),
    );
}

function rolesSection(container: ContainerBuilder, config: GuildConfigData, view: ConfigView): void {
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Admin role:** ${role(config.roles.adminRoleId)}${config.roles.adminRoleId ? '' : ' — members with Administrator count as admin'}`,
        `**Mod role:** ${role(config.roles.modRoleId)}`,
        '-# Mod: notes, warns, timeouts, purge, lookup. Admin: all of that plus kick, ban, config and posting.',
      ].join('\n'),
    ),
  );
  for (const tier of ['admin', 'mod'] as const) {
    const id = tier === 'admin' ? config.roles.adminRoleId : config.roles.modRoleId;
    const select = new RoleSelectMenuBuilder()
      .setCustomId(configId(`role-${tier}`, view))
      .setPlaceholder(`${tier === 'admin' ? 'Admin' : 'Mod'} role (clear to unset)`)
      .setMinValues(0)
      .setMaxValues(1);
    if (id) select.setDefaultRoles(id);
    container.addActionRowComponents(new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(select));
  }
}

function welcomeSection(container: ContainerBuilder, config: GuildConfigData, view: ConfigView): void {
  const { welcome } = config;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Welcome messages:** ${welcome.enabled ? '✅ on' : '⛔ off'}`,
        `**Channel:** ${channel(welcome.channelId)}`,
        `**Message:**\n${quote(welcome.message?.trim() || DEFAULT_WELCOME, 1500)}`,
        '-# Placeholders: `{user}` `{username}` `{server}` `{memberCount}`',
      ].join('\n'),
    ),
  );
  const select = new ChannelSelectMenuBuilder()
    .setCustomId(configId('welcomechannel', view))
    .setPlaceholder('Welcome channel')
    .setChannelTypes(...LOG_CHANNEL_TYPES)
    .setMinValues(0)
    .setMaxValues(1);
  if (welcome.channelId) select.setDefaultChannels(welcome.channelId);
  container
    .addActionRowComponents(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(select))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(configId('welcometoggle', view))
          .setStyle(welcome.enabled ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setLabel(welcome.enabled ? 'Disable welcomes' : 'Enable welcomes'),
        new ButtonBuilder().setCustomId(configId('welcomeedit', view)).setStyle(ButtonStyle.Primary).setLabel('Edit message'),
        new ButtonBuilder().setCustomId(configId('welcomepreview', view)).setStyle(ButtonStyle.Secondary).setLabel('Preview'),
      ),
    );
}


export const STAR_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25];

function starboardSection(container: ContainerBuilder, config: GuildConfigData, view: ConfigView): void {
  const { starboard } = config;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Starboard:** ${starboard.enabled ? '✅ on' : '⛔ off'}`,
        `**Channel:** ${channel(starboard.channelId)}`,
        `**Emoji:** ${displayEmoji(starboard.emoji)} · **Needs:** ${starboard.threshold} · **Self-stars:** ${starboard.selfStar ? 'count' : "don't count"}`,
      ].join('\n'),
    ),
  );
  const select = new ChannelSelectMenuBuilder()
    .setCustomId(configId('starchannel', view))
    .setPlaceholder('Starboard channel')
    .setChannelTypes(...LOG_CHANNEL_TYPES)
    .setMinValues(0)
    .setMaxValues(1);
  if (starboard.channelId) select.setDefaultChannels(starboard.channelId);
  const threshold = new StringSelectMenuBuilder()
    .setCustomId(configId('starthreshold', view))
    .addOptions(
      STAR_THRESHOLDS.map((n) => ({ label: `Post at ${n} star${n === 1 ? '' : 's'}`, value: String(n), default: n === starboard.threshold })),
    );
  container
    .addActionRowComponents(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(select))
    .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(threshold))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(configId('startoggle', view))
          .setStyle(starboard.enabled ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setLabel(starboard.enabled ? 'Disable starboard' : 'Enable starboard'),
        new ButtonBuilder().setCustomId(configId('staremoji', view)).setStyle(ButtonStyle.Primary).setLabel('Set emoji'),
        new ButtonBuilder()
          .setCustomId(configId('starself', view))
          .setStyle(ButtonStyle.Secondary)
          .setLabel(starboard.selfStar ? "Don't count self-stars" : 'Count self-stars'),
      ),
    );
}

export const DAILY_LIMIT_CHOICES = [0, 1, 3, 5, 10, 20, 50];
const BOT_GAMES = [
  { game: 'coinflip', label: 'Coin flip' },
  { game: 'highlow', label: 'High/low' },
  { game: 'dice', label: 'Dice vs bot' },
] as const;

function gamesSection(container: ContainerBuilder, config: GuildConfigData, view: ConfigView): void {
  const { games } = config;
  const limit = (n: number) => (n === 0 ? 'unlimited' : `${n}/day`);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Points and rep:** ${games.pointsEnabled ? '✅ on' : '⛔ off'}`,
        `**Daily plays vs the bot:** ${BOT_GAMES.map((g) => `${g.label} ${limit(games.dailyLimits[g.game])}`).join(' · ')}`,
        '-# With points on: wins earn a point, a high/low cash-out earns its run, and `/rep` gives one a day.',
      ].join('\n'),
    ),
  );
  for (const { game, label } of BOT_GAMES) {
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(configId(`limit-${game}`, view))
          .addOptions(
            DAILY_LIMIT_CHOICES.map((n) => ({
              label: `${label}: ${n === 0 ? 'unlimited' : `${n} per day`}`,
              value: String(n),
              default: n === games.dailyLimits[game],
            })),
          ),
      ),
    );
  }
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(configId('pointstoggle', view))
        .setStyle(games.pointsEnabled ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setLabel(games.pointsEnabled ? 'Turn points off' : 'Turn points on'),
    ),
  );
}

export function renderConfigPanel(config: GuildConfigData, guildName: string, view: ConfigView) {
  const container = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⚙️ Server config — ${guildName}`))
    .addActionRowComponents(sectionSelect(view))
    .addSeparatorComponents(new SeparatorBuilder());

  if (view.section === 'logging') loggingSection(container, config, view);
  else if (view.section === 'roles') rolesSection(container, config, view);
  else if (view.section === 'welcome') welcomeSection(container, config, view);
  else if (view.section === 'starboard') starboardSection(container, config, view);
  else gamesSection(container, config, view);

  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(brandFooter()));

  return { components: [container], flags: MessageFlags.IsComponentsV2 as const, allowedMentions: { parse: [] as [] } };
}
