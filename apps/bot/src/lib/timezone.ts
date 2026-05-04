import spacetime from 'spacetime';

export interface ParsedTimezone {
  ianaZone: string;
  displayName: string;
  currentOffset: string;
}

export function parseTimezone(input: string): ParsedTimezone | null {
  try {
    const s = spacetime.now(input.trim());
    const tz = s.tz;
    // spacetime silently falls back to UTC for unrecognised input; validate by
    // checking the resolved zone is in its known timezone list.
    if (!s.timezones[tz]) return null;

    const meta = s.timezone();
    const off = meta.current.offset;
    const sign = off >= 0 ? '+' : '-';
    const h = Math.floor(Math.abs(off));
    const m = Math.round((Math.abs(off) - h) * 60);
    const currentOffset =
      m > 0
        ? `UTC${sign}${h}:${m.toString().padStart(2, '0')}`
        : `UTC${sign}${h}`;

    return { ianaZone: tz, displayName: meta.display || tz, currentOffset };
  } catch {
    return null;
  }
}
