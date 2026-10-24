import spacetime from 'spacetime';
import type { EventRsvp, ReminderOffset, RsvpStatus } from '@bedge/types';
import { parseTimezone } from '../timezone.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const OFFSET_MS: Record<ReminderOffset, number> = {
  '1w': 7 * DAY,
  '1d': DAY,
  '12h': 12 * HOUR,
  '6h': 6 * HOUR,
  '3h': 3 * HOUR,
  '1h': HOUR,
  '30m': 30 * MIN,
  '15m': 15 * MIN,
  '10m': 10 * MIN,
  '5m': 5 * MIN,
  start: 0,
};

export const OFFSET_LABELS: Record<ReminderOffset, string> = {
  '1w': '1 week before',
  '1d': '1 day before',
  '12h': '12 hours before',
  '6h': '6 hours before',
  '3h': '3 hours before',
  '1h': '1 hour before',
  '30m': '30 minutes before',
  '15m': '15 minutes before',
  '10m': '10 minutes before',
  '5m': '5 minutes before',
  start: 'At the start',
};

export const ALL_OFFSETS = Object.keys(OFFSET_MS) as ReminderOffset[];
export const DEFAULT_OFFSETS: ReminderOffset[] = ['1h', 'start'];

/** How long after the start an "at start" reminder may still go out, e.g. after a restart. */
export const START_GRACE_MS = 15 * MIN;

export type ParsedTime = { ok: true; date: Date } | { ok: false; error: string };

export function parseEventTime(input: string, timezone: string, now = Date.now()): ParsedTime {
  const text = input.trim();
  let date: Date | null = null;

  const discord = text.match(/^<t:(\d{9,11})(?::[a-zA-Z])?>$/) ?? text.match(/^(\d{9,11})$/);
  if (discord) {
    date = new Date(Number(discord[1]) * 1000);
  } else {
    const local = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
    if (!local) return { ok: false, error: 'Use `YYYY-MM-DD HH:mm` (e.g. `2026-11-01 19:30`) or a Discord timestamp like `<t:1793568600>`.' };
    const zone = parseTimezone(timezone);
    if (!zone) return { ok: false, error: `\`${timezone}\` isn't a timezone I recognise. Try something like \`Australia/Sydney\`.` };
    const [, y, mo, d, h, mi] = local;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31 || Number(h) > 23 || Number(mi) > 59) {
      return { ok: false, error: 'That date or time is out of range.' };
    }
    date = new Date(spacetime(`${y}-${mo}-${d}T${h.padStart(2, '0')}:${mi}:00`, zone.ianaZone).epoch);
  }

  if (Number.isNaN(date.getTime())) return { ok: false, error: 'That time could not be read.' };
  if (date.getTime() <= now) return { ok: false, error: 'That time is in the past.' };
  return { ok: true, date };
}

/** Sets the user's RSVP; choosing the status they already have removes it. */
export function toggleRsvp(rsvps: readonly EventRsvp[], userId: string, status: RsvpStatus): EventRsvp[] {
  const existing = rsvps.find((r) => r.userId === userId);
  const others = rsvps.filter((r) => r.userId !== userId);
  return existing?.status === status ? others : [...others, { userId, status }];
}

export function groupRsvps(rsvps: readonly EventRsvp[]): Record<RsvpStatus, string[]> {
  const groups: Record<RsvpStatus, string[]> = { going: [], maybe: [], no: [] };
  for (const r of rsvps) groups[r.status].push(r.userId);
  return groups;
}

export interface ReminderState {
  startsAt: Date;
  reminderOffsets: readonly ReminderOffset[];
  sentOffsets: readonly ReminderOffset[];
  cancelled: boolean;
}

/**
 * Which pending reminders to send now and which to give up on. When several are due at once (the bot was down),
 * only the one closest to the start is sent so members don't get a burst of stale reminders.
 */
export function remindersToProcess(event: ReminderState, now = Date.now()): { send: ReminderOffset | null; skip: ReminderOffset[] } {
  if (event.cancelled) return { send: null, skip: [] };
  const start = event.startsAt.getTime();
  const due = event.reminderOffsets
    .filter((o) => !event.sentOffsets.includes(o) && now >= start - OFFSET_MS[o])
    .sort((a, b) => OFFSET_MS[a] - OFFSET_MS[b]);
  if (due.length === 0) return { send: null, skip: [] };

  const [closest, ...stale] = due;
  const stillUseful = closest === 'start' ? now <= start + START_GRACE_MS : now < start;
  return stillUseful ? { send: closest, skip: stale } : { send: null, skip: due };
}
