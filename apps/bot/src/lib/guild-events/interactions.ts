import { GuildEventModel } from '@bedge/database';
import { ReminderOffsetSchema, RsvpStatusSchema } from '@bedge/types';
import {
  MessageFlags,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { log } from '../logs/router.js';
import { subjectOf } from '../logs/subject.js';
import { requireTier } from '../tier-check.js';
import { parseTimezone } from '../timezone.js';
import { parseEventTime, toggleRsvp } from './logic.js';
import { eventModal, formatEventTime, renderEventCard, renderManagePanel } from './render.js';
import { createEvent, eventUrl, getEvent, refreshCard, sendReminder, toView } from './service.js';

function readForm(interaction: ModalSubmitInteraction) {
  const get = (id: string) => interaction.fields.getTextInputValue(id).trim();
  const imageUrl = get('image') || undefined;
  return { title: get('title'), time: get('time'), timezone: get('timezone'), description: get('description') || undefined, imageUrl };
}

function validateForm(form: ReturnType<typeof readForm>): { error: string } | { startsAt: Date; timezone: string } {
  const zone = parseTimezone(form.timezone);
  if (!zone) return { error: `\`${form.timezone}\` isn't a timezone I recognise. Try something like \`Australia/Sydney\`.` };
  if (form.imageUrl && !/^https:\/\/\S+$/.test(form.imageUrl)) return { error: 'The image must be an https URL.' };
  const time = parseEventTime(form.time, zone.ianaZone);
  if (!time.ok) return { error: time.error };
  return { startsAt: time.date, timezone: zone.ianaZone };
}

export async function handleEventModal(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
  if (!(await requireTier(interaction, 'mod'))) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const form = readForm(interaction);
  const checked = validateForm(form);
  if ('error' in checked) return void (await interaction.editReply(`❌ ${checked.error}`));
  const [kind, a, b] = interaction.customId.split(':');

  if (kind === 'evtc') {
    try {
      const event = await createEvent({
        guild: interaction.guild,
        channelId: a,
        pingRoleId: b === '-' ? undefined : b,
        hostId: interaction.user.id,
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl,
        ...checked,
      });
      await interaction.editReply(`📅 Event #${event.eventNumber} posted — ${eventUrl(event)}\nUse \`/event manage\` to choose reminder channels and times (default: this channel, 1 hour before and at the start).`);
      await log(interaction.guild, 'event.create', {
        subject: subjectOf(interaction.member),
        body: `**${event.title}** — <t:${Math.floor(event.startsAt.getTime() / 1000)}:F>`,
        links: eventUrl(event) ? [{ label: 'Jump to event', url: eventUrl(event)! }] : [],
      });
    } catch (error) {
      await interaction.editReply(`❌ ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  const doc = await getEvent(a);
  if (!doc || doc.guildId !== interaction.guildId) return void (await interaction.editReply('❌ That event no longer exists.'));
  doc.set({ title: form.title, description: form.description, imageUrl: form.imageUrl, startsAt: checked.startsAt, timezone: checked.timezone });
  // A new start time re-arms reminders that haven't happened yet.
  if (doc.isModified('startsAt')) doc.sentOffsets = [];
  await doc.save();
  const event = toView(doc);
  await refreshCard(event);
  await interaction.editReply(`✏️ Event #${event.eventNumber} updated.`);
  await log(interaction.guild, 'event.update', {
    subject: subjectOf(interaction.member),
    body: `**${event.title}** — <t:${Math.floor(event.startsAt.getTime() / 1000)}:F>`,
    links: eventUrl(event) ? [{ label: 'Jump to event', url: eventUrl(event)! }] : [],
  });
}

export async function handleRsvp(interaction: ButtonInteraction<'cached'>): Promise<void> {
  const [, , id, rawStatus] = interaction.customId.split(':');
  const status = RsvpStatusSchema.safeParse(rawStatus);
  const doc = await getEvent(id);
  if (!doc || !status.success || doc.cancelled) {
    await interaction.reply({ content: '❌ This event is no longer taking RSVPs.', flags: MessageFlags.Ephemeral });
    return;
  }
  doc.rsvps = toggleRsvp(doc.rsvps, interaction.user.id, status.data);
  await doc.save();
  await interaction.update(renderEventCard(toView(doc)));
}

export async function handleManage(interaction: ButtonInteraction<'cached'> | AnySelectMenuInteraction<'cached'>): Promise<void> {
  if (!(await requireTier(interaction, 'mod'))) return;
  const [, action, id] = interaction.customId.split(':');
  const doc = await getEvent(id);
  if (!doc || doc.guildId !== interaction.guildId) {
    await interaction.reply({ content: '❌ That event no longer exists.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === 'edit') {
    const event = toView(doc);
    await interaction.showModal(
      eventModal(`evte:${event.id}`, `Edit event #${event.eventNumber}`, {
        title: event.title,
        time: formatEventTime(event.startsAt, event.timezone),
        timezone: event.timezone,
        description: event.description,
        imageUrl: event.imageUrl,
      }),
    );
    return;
  }

  if (action === 'remind') {
    // The offset only picks the wording: "starts in …" before the start, "starting now" after it.
    const sent = await sendReminder(toView(doc), Date.now() >= doc.startsAt.getTime() ? 'start' : '1h');
    await interaction.reply({ content: `⏰ Reminder sent to ${sent} channel(s).`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === 'channels' && interaction.isChannelSelectMenu()) doc.reminderChannelIds = interaction.values;
  if (action === 'offsets' && interaction.isStringSelectMenu()) {
    doc.reminderOffsets = interaction.values.filter((v) => ReminderOffsetSchema.safeParse(v).success) as typeof doc.reminderOffsets;
  }
  if (action === 'cancel') doc.cancelled = true;
  await doc.save();

  const event = toView(doc);
  await interaction.update(renderManagePanel(event, eventUrl(event)));
  if (action === 'cancel') {
    await refreshCard(event);
    await log(interaction.guild, 'event.cancel', {
      subject: subjectOf(interaction.member),
      body: `**${event.title}** was cancelled`,
      links: eventUrl(event) ? [{ label: 'Jump to event', url: eventUrl(event)! }] : [],
    });
  }
}

export async function upcomingEvents(guildId: string) {
  const docs = await GuildEventModel.find({ guildId, cancelled: false, startsAt: { $gt: new Date() } }).sort({ startsAt: 1 }).limit(25);
  return docs.map(toView);
}
