import { GuildEventModel, TimeTrackConfigModel, nextSequence, type GuildEventDocument } from '@bedge/database';
import type { ReminderOffset } from '@bedge/types';
import { container } from '@sapphire/framework';
import type { Guild } from 'discord.js';
import { config } from '../../config.js';
import { DEFAULT_OFFSETS, START_GRACE_MS, OFFSET_MS, remindersToProcess } from './logic.js';
import { renderEventCard, renderReminder, type EventView } from './render.js';

export function toView(doc: GuildEventDocument): EventView {
  const o = doc.toObject();
  return { ...o, id: String(doc._id), startsAt: new Date(o.startsAt) } as EventView;
}

export function eventUrl(event: Pick<EventView, 'guildId' | 'channelId' | 'messageId'>): string | null {
  return event.messageId ? `https://discord.com/channels/${event.guildId}/${event.channelId}/${event.messageId}` : null;
}

export async function defaultTimezoneFor(guildId: string, userId: string): Promise<string> {
  const tracked = await TimeTrackConfigModel.findOne({ guildId, memberId: userId });
  return tracked?.timezone ?? config.defaultTimezone;
}

export function getEvent(id: string): Promise<GuildEventDocument | null> {
  return /^[a-f0-9]{24}$/.test(id) ? GuildEventModel.findById(id) : Promise.resolve(null);
}

export interface NewEvent {
  guild: Guild;
  channelId: string;
  hostId: string;
  pingRoleId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  startsAt: Date;
  timezone: string;
}

export async function createEvent(input: NewEvent): Promise<EventView> {
  const channel = await input.guild.channels.fetch(input.channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.isSendable()) throw new Error('I can’t post in that channel.');

  const eventNumber = await nextSequence(`events:${input.guild.id}`);
  const doc = await GuildEventModel.create({
    guildId: input.guild.id,
    eventNumber,
    channelId: input.channelId,
    title: input.title,
    description: input.description,
    imageUrl: input.imageUrl,
    startsAt: input.startsAt,
    timezone: input.timezone,
    hostId: input.hostId,
    pingRoleId: input.pingRoleId,
    reminderChannelIds: [input.channelId],
    reminderOffsets: DEFAULT_OFFSETS,
  });
  try {
    const message = await channel.send(renderEventCard(toView(doc)));
    doc.messageId = message.id;
    await doc.save();
  } catch (error) {
    await doc.deleteOne();
    throw error;
  }
  return toView(doc);
}

/** Re-renders the posted card after an RSVP, edit or cancellation. Missing messages are logged, not thrown. */
export async function refreshCard(event: EventView): Promise<void> {
  if (!event.messageId) return;
  const guild = container.client.guilds.cache.get(event.guildId);
  const channel = await guild?.channels.fetch(event.channelId).catch(() => null);
  const message = channel?.isTextBased() ? await channel.messages.fetch(event.messageId).catch(() => null) : null;
  if (!message) {
    container.logger.warn(`events: card for event ${event.id} is missing`);
    return;
  }
  await message.edit(renderEventCard(event));
}

export async function sendReminder(event: EventView, offset: ReminderOffset): Promise<number> {
  const guild = container.client.guilds.cache.get(event.guildId);
  if (!guild) return 0;
  let sent = 0;
  for (const channelId of event.reminderChannelIds) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !channel.isSendable()) {
      container.logger.warn(`events: reminder channel ${channelId} for event ${event.id} is missing or not sendable`);
      continue;
    }
    await channel.send(renderReminder(event, offset, eventUrl(event))).then(
      () => sent++,
      (error: unknown) => container.logger.warn(`events: reminder to ${channelId} failed — ${String(error)}`),
    );
  }
  return sent;
}

/** The minute-by-minute TaskManager job; state lives in Mongo, so restarts don't lose or repeat reminders. */
export function createEventRemindersJob() {
  return async (): Promise<void> => {
    // Reminders are marked sent before posting, so never run before the guild cache exists.
    if (!container.client.isReady()) return;
    const now = Date.now();
    const events = await GuildEventModel.find({
      cancelled: false,
      startsAt: { $gt: new Date(now - START_GRACE_MS), $lt: new Date(now + OFFSET_MS['1w'] + 60_000) },
    });
    for (const doc of events) {
      const event = toView(doc);
      const { send, skip } = remindersToProcess(event, now);
      if (!send && skip.length === 0) continue;
      // Marked before sending so a crash mid-send can't produce duplicates on the next tick.
      await GuildEventModel.updateOne({ _id: doc._id }, { $addToSet: { sentOffsets: { $each: [...skip, ...(send ? [send] : [])] } } });
      if (send) await sendReminder(event, send);
    }
  };
}
