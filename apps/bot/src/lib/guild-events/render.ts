import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ContainerBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  ModalBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import spacetime from 'spacetime';
import type { GuildEvent, ReminderOffset, RsvpStatus } from '@bedge/types';
import { BRAND_COLOUR, brandFooter } from '../brand.js';
import { COLOURS } from '../logs/log-types.js';
import { POSTABLE_CHANNEL_TYPES } from '../posting/send.js';
import { ALL_OFFSETS, OFFSET_LABELS, groupRsvps } from './logic.js';

export type EventView = Omit<GuildEvent, 'startsAt'> & { id: string; startsAt: Date };

const MAX_LISTED = 30;

const RSVP_META: Record<RsvpStatus, { emoji: string; label: string; style: ButtonStyle }> = {
  going: { emoji: '✅', label: 'Going', style: ButtonStyle.Success },
  maybe: { emoji: '🤔', label: 'Maybe', style: ButtonStyle.Secondary },
  no: { emoji: '❌', label: "Can't", style: ButtonStyle.Secondary },
};

const unix = (d: Date) => Math.floor(d.getTime() / 1000);

function rsvpBlock(event: EventView): string {
  const groups = groupRsvps(event.rsvps);
  return (Object.keys(RSVP_META) as RsvpStatus[])
    .map((status) => {
      const ids = groups[status];
      const { emoji, label } = RSVP_META[status];
      const listed = ids.slice(0, MAX_LISTED).map((id) => `<@${id}>`).join(' ');
      const more = ids.length > MAX_LISTED ? ` +${ids.length - MAX_LISTED} more` : '';
      return `${emoji} **${label} (${ids.length})**${ids.length ? `\n${listed}${more}` : ''}`;
    })
    .join('\n');
}

export function renderEventCard(event: EventView) {
  const title = event.cancelled ? `## ~~${event.title}~~ — Cancelled` : `## 📅 ${event.title}`;
  const container = new ContainerBuilder()
    .setAccentColor(event.cancelled ? COLOURS.grey : BRAND_COLOUR)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [title, `🕒 <t:${unix(event.startsAt)}:F> (<t:${unix(event.startsAt)}:R>)`, `👤 Hosted by <@${event.hostId}>`].join('\n'),
      ),
    );
  if (event.description) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(event.description));
  if (event.imageUrl) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems((i) => i.setURL(event.imageUrl!)));
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(rsvpBlock(event)))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        (Object.keys(RSVP_META) as RsvpStatus[]).map((status) =>
          new ButtonBuilder()
            .setCustomId(`evt:rsvp:${event.id}:${status}`)
            .setStyle(RSVP_META[status].style)
            .setLabel(RSVP_META[status].label)
            .setEmoji(RSVP_META[status].emoji)
            .setDisabled(event.cancelled),
        ),
      ),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Event #${event.eventNumber}`))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(brandFooter()));
  return { components: [container], flags: MessageFlags.IsComponentsV2 as const, allowedMentions: { parse: [] as [] } };
}

export function renderReminder(event: EventView, offset: ReminderOffset, eventUrl: string | null) {
  const when = offset === 'start' ? 'is starting now!' : `starts <t:${unix(event.startsAt)}:R>`;
  const going = groupRsvps(event.rsvps).going.slice(0, 90);
  const pings = [event.pingRoleId ? `<@&${event.pingRoleId}>` : '', ...going.map((id) => `<@${id}>`)].filter(Boolean);

  const container = new ContainerBuilder()
    .setAccentColor(COLOURS.yellow)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ⏰ ${event.title} ${when}\n🕒 <t:${unix(event.startsAt)}:F>`),
    );
  if (pings.length) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(pings.join(' ')));
  if (eventUrl) {
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('View event').setURL(eventUrl),
      ),
    );
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(brandFooter()));
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as const,
    allowedMentions: { users: going, roles: event.pingRoleId ? [event.pingRoleId] : [] },
  };
}

export function renderManagePanel(event: EventView, eventUrl: string | null) {
  const channels = event.reminderChannelIds.length ? event.reminderChannelIds.map((id) => `<#${id}>`).join(' ') : '*none*';
  const times = event.reminderOffsets.length ? event.reminderOffsets.map((o) => OFFSET_LABELS[o]).join(', ') : '*none*';
  const container = new ContainerBuilder()
    .setAccentColor(event.cancelled ? COLOURS.grey : BRAND_COLOUR)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### 🛠️ Event #${event.eventNumber} — ${event.title}${event.cancelled ? ' *(cancelled)*' : ''}`,
          `🕒 <t:${unix(event.startsAt)}:F>`,
          `**Reminder channels:** ${channels}`,
          `**Reminder times:** ${times}`,
        ].join('\n'),
      ),
    );

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`evtm:channels:${event.id}`)
    .setPlaceholder('Reminder channels')
    .setChannelTypes(...POSTABLE_CHANNEL_TYPES)
    .setMinValues(0)
    .setMaxValues(5)
    .setDisabled(event.cancelled);
  if (event.reminderChannelIds.length) channelSelect.setDefaultChannels(...event.reminderChannelIds);

  const offsetSelect = new StringSelectMenuBuilder()
    .setCustomId(`evtm:offsets:${event.id}`)
    .setPlaceholder('Reminder times')
    .setMinValues(0)
    .setMaxValues(ALL_OFFSETS.length)
    .setDisabled(event.cancelled)
    .addOptions(ALL_OFFSETS.map((o) => ({ label: OFFSET_LABELS[o], value: o, default: event.reminderOffsets.includes(o) })));

  const buttons = [
    new ButtonBuilder().setCustomId(`evtm:edit:${event.id}`).setStyle(ButtonStyle.Primary).setLabel('Edit details').setDisabled(event.cancelled),
    new ButtonBuilder().setCustomId(`evtm:remind:${event.id}`).setStyle(ButtonStyle.Secondary).setLabel('Send reminder now').setDisabled(event.cancelled),
    new ButtonBuilder().setCustomId(`evtm:cancel:${event.id}`).setStyle(ButtonStyle.Danger).setLabel('Cancel event').setDisabled(event.cancelled),
  ];
  if (eventUrl) buttons.push(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('View event').setURL(eventUrl));

  container
    .addActionRowComponents(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect))
    .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(offsetSelect))
    .addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));
  return { components: [container], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as number, allowedMentions: { parse: [] as [] } };
}

export interface EventFormValues {
  title?: string;
  time?: string;
  timezone: string;
  description?: string;
  imageUrl?: string;
}

export function formatEventTime(date: Date, timezone: string): string {
  return spacetime(date.getTime(), timezone).unixFmt('yyyy-MM-dd HH:mm');
}

export function eventModal(customId: string, heading: string, v: EventFormValues): ModalBuilder {
  const input = (id: string, style: TextInputStyle, max: number, required: boolean, value?: string) => {
    const t = new TextInputBuilder().setCustomId(id).setStyle(style).setMaxLength(max).setRequired(required);
    if (value) t.setValue(value);
    return t;
  };
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(heading)
    .addLabelComponents(
      new LabelBuilder().setLabel('Title').setTextInputComponent(input('title', TextInputStyle.Short, 200, true, v.title)),
      new LabelBuilder()
        .setLabel('Start time')
        .setDescription('YYYY-MM-DD HH:mm, or a Discord timestamp')
        .setTextInputComponent(input('time', TextInputStyle.Short, 40, true, v.time)),
      new LabelBuilder().setLabel('Timezone').setTextInputComponent(input('timezone', TextInputStyle.Short, 60, true, v.timezone)),
      new LabelBuilder().setLabel('Description').setTextInputComponent(input('description', TextInputStyle.Paragraph, 3000, false, v.description)),
      new LabelBuilder().setLabel('Image URL').setTextInputComponent(input('image', TextInputStyle.Short, 500, false, v.imageUrl)),
    );
}
