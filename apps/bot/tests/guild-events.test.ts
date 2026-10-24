import { describe, it, expect } from 'vitest';
import {
  OFFSET_MS,
  START_GRACE_MS,
  groupRsvps,
  parseEventTime,
  remindersToProcess,
  toggleRsvp,
} from '../src/lib/guild-events/logic.js';
import {
  eventModal,
  formatEventTime,
  renderEventCard,
  renderManagePanel,
  renderReminder,
  type EventView,
} from '../src/lib/guild-events/render.js';
import { COLOURS } from '../src/lib/logs/log-types.js';

const NOW = Date.UTC(2026, 9, 22, 12, 0);

describe('parseEventTime', () => {
  it('reads local time in the given zone', () => {
    const result = parseEventTime('2026-11-01 19:30', 'UTC', NOW);
    expect(result).toEqual({ ok: true, date: new Date(Date.UTC(2026, 10, 1, 19, 30)) });
  });

  it('applies the timezone offset', () => {
    const result = parseEventTime('2027-01-15 09:30', 'Australia/Sydney', NOW);
    expect(result.ok && result.date.toISOString()).toBe('2027-01-14T22:30:00.000Z');
  });

  it('accepts Discord timestamps and raw unix seconds', () => {
    const unix = Math.floor(NOW / 1000) + 3600;
    expect(parseEventTime(`<t:${unix}:F>`, 'UTC', NOW)).toEqual({ ok: true, date: new Date(unix * 1000) });
    expect(parseEventTime(String(unix), 'UTC', NOW)).toEqual({ ok: true, date: new Date(unix * 1000) });
  });

  it('rejects past times, bad formats, bad zones and out-of-range values', () => {
    expect(parseEventTime('2020-01-01 10:00', 'UTC', NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/past/) });
    expect(parseEventTime('tomorrow', 'UTC', NOW)).toMatchObject({ ok: false });
    expect(parseEventTime('2026-11-01 19:30', 'Mars/Olympus', NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/timezone/) });
    expect(parseEventTime('2026-13-01 19:30', 'UTC', NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/range/) });
  });
});

describe('RSVPs', () => {
  it('adds, switches and toggles off', () => {
    let rsvps = toggleRsvp([], 'a', 'going');
    expect(rsvps).toEqual([{ userId: 'a', status: 'going' }]);
    rsvps = toggleRsvp(rsvps, 'a', 'maybe');
    expect(rsvps).toEqual([{ userId: 'a', status: 'maybe' }]);
    rsvps = toggleRsvp(rsvps, 'a', 'maybe');
    expect(rsvps).toEqual([]);
  });

  it('groups by status', () => {
    expect(
      groupRsvps([
        { userId: 'a', status: 'going' },
        { userId: 'b', status: 'no' },
        { userId: 'c', status: 'going' },
      ]),
    ).toEqual({ going: ['a', 'c'], maybe: [], no: ['b'] });
  });
});

describe('renderers', () => {
  const event: EventView = {
    id: 'a'.repeat(24),
    guildId: 'g',
    eventNumber: 3,
    channelId: 'c',
    messageId: 'm',
    title: 'Game night',
    description: 'Bring snacks',
    imageUrl: 'https://cdn.example/banner.png',
    startsAt: new Date(NOW + 3_600_000),
    timezone: 'UTC',
    hostId: 'h',
    pingRoleId: 'r',
    reminderChannelIds: ['c'],
    reminderOffsets: ['1h', 'start'],
    sentOffsets: [],
    rsvps: Array.from({ length: 40 }, (_, i) => ({ userId: `u${i}`, status: i % 3 === 0 ? 'maybe' : 'going' }) as const),
    cancelled: false,
  };

  it('renders a valid card that lists RSVPs without pinging', () => {
    const card = renderEventCard(event);
    const json = JSON.stringify(card.components[0].toJSON());
    expect(json).toContain('Game night');
    expect(json).toContain('Going (26)');
    expect(json).not.toContain('more');
    expect(card.allowedMentions).toEqual({ parse: [] });
  });

  it('caps each RSVP list at 30 names', () => {
    const crowd = Array.from({ length: 50 }, (_, i) => ({ userId: `u${i}`, status: 'going' as const }));
    expect(JSON.stringify(renderEventCard({ ...event, rsvps: crowd }).components[0].toJSON())).toContain('+20 more');
  });

  it('greys and disables a cancelled card', () => {
    const json = renderEventCard({ ...event, cancelled: true }).components[0].toJSON();
    expect(json.accent_color).toBe(COLOURS.grey);
    expect(JSON.stringify(json)).toContain('"disabled":true');
  });

  it('pings the role and the people going in reminders', () => {
    const reminder = renderReminder(event, '1h', 'https://discord.com/channels/g/c/m');
    expect(reminder.allowedMentions.roles).toEqual(['r']);
    expect(reminder.allowedMentions.users).toHaveLength(26);
    expect(JSON.stringify(reminder.components[0].toJSON())).toContain('View event');
  });

  it('builds a valid manage panel and modal', () => {
    expect(() => renderManagePanel(event, null).components[0].toJSON()).not.toThrow();
    expect(() => eventModal('evte:x', 'Edit', { timezone: 'UTC', title: 'T', time: '2026-11-01 19:30' }).toJSON()).not.toThrow();
  });

  it('formats a start time back into the form', () => {
    expect(formatEventTime(new Date('2027-01-14T22:30:00Z'), 'Australia/Sydney')).toBe('2027-01-15 09:30');
  });
});

describe('remindersToProcess', () => {
  const start = new Date(NOW + 2 * 3_600_000);
  const base = { startsAt: start, reminderOffsets: ['1d', '1h', 'start'] as const, sentOffsets: [] as never[], cancelled: false };

  it('sends nothing before the first reminder is due', () => {
    expect(remindersToProcess({ ...base, reminderOffsets: ['1h', 'start'] }, NOW)).toEqual({ send: null, skip: [] });
  });

  it('sends the closest due reminder and skips stale ones', () => {
    const at = start.getTime() - OFFSET_MS['1h'] + 1000;
    expect(remindersToProcess({ ...base, reminderOffsets: ['1d', '1h', 'start'] }, at)).toEqual({ send: '1h', skip: ['1d'] });
  });

  it('does not resend sent reminders', () => {
    const at = start.getTime() - OFFSET_MS['1h'] + 1000;
    expect(remindersToProcess({ ...base, reminderOffsets: ['1d', '1h'], sentOffsets: ['1d', '1h'] as never[] }, at)).toEqual({
      send: null,
      skip: [],
    });
  });

  it('allows the at-start reminder within the grace window, then skips it', () => {
    expect(remindersToProcess({ ...base, reminderOffsets: ['start'] }, start.getTime() + 60_000).send).toBe('start');
    expect(remindersToProcess({ ...base, reminderOffsets: ['start'] }, start.getTime() + START_GRACE_MS + 1)).toEqual({
      send: null,
      skip: ['start'],
    });
  });

  it('skips a pre-start reminder once the event has begun', () => {
    expect(remindersToProcess({ ...base, reminderOffsets: ['1h'] }, start.getTime() + 1)).toEqual({ send: null, skip: ['1h'] });
  });

  it('ignores cancelled events', () => {
    expect(remindersToProcess({ ...base, cancelled: true }, start.getTime())).toEqual({ send: null, skip: [] });
  });
});
