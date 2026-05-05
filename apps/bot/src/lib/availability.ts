import type { AvailabilityLevel, AvailabilityWindow } from '@bedge/types';

export type StoplightDot = '🟢' | '🟡' | '🟠' | '🔴';

export const DOTS: Record<AvailabilityLevel, StoplightDot> = {
  green: '🟢',
  yellow: '🟡',
  orange: '🟠',
  red: '🔴',
};

export const LEVEL_LABELS: Record<AvailabilityLevel, string> = {
  green: '🟢 Definitely available',
  yellow: '🟡 Maybe available',
  orange: '🟠 Probably unavailable',
  red: '🔴 Unavailable',
};

export const LEVEL_COLORS: Record<AvailabilityLevel, number> = {
  green: 0x57f287,
  yellow: 0xfee75c,
  orange: 0xe67e22,
  red: 0xed4245,
};

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isInWindow(currentMinutes: number, window: AvailabilityWindow): boolean {
  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);
  // Overnight: end before start means the window wraps past midnight
  if (end < start) return currentMinutes >= start || currentMinutes < end;
  return currentMinutes >= start && currentMinutes < end;
}

// Default rules applied when no custom config exists or no window matches
// - 00:00–08:00 → red
// - 08:00–18:00 Mon–Fri (day 1–5) → orange
// - all other times → yellow
export function computeDefaultLevel(currentMinutes: number, currentDay: number): AvailabilityLevel {
  if (currentMinutes < 8 * 60) return 'red';
  if (currentDay >= 1 && currentDay <= 5 && currentMinutes < 18 * 60) return 'orange';
  return 'yellow';
}

export interface AvailabilityComputeInput {
  broad: AvailabilityWindow[];
  weekdays: Map<string, AvailabilityWindow[] | null> | Record<string, AvailabilityWindow[] | null>;
  override?: { level: string; expiresAt: Date } | null;
}

export function computeLevel(
  currentMinutes: number,
  currentDay: number,
  config: AvailabilityComputeInput | null,
): AvailabilityLevel {
  // Active override takes highest precedence
  if (config?.override && config.override.expiresAt > new Date()) {
    return config.override.level as AvailabilityLevel;
  }

  if (config) {
    const weekdayWindows =
      config.weekdays instanceof Map
        ? config.weekdays.get(String(currentDay)) ?? null
        : (config.weekdays as Record<string, AvailabilityWindow[] | null>)[String(currentDay)] ?? null;

    const layer = weekdayWindows !== null ? weekdayWindows : config.broad;
    for (const window of layer ?? []) {
      if (isInWindow(currentMinutes, window)) return window.level;
    }
  }

  return computeDefaultLevel(currentMinutes, currentDay);
}

export function levelToStoplightDot(level: AvailabilityLevel): StoplightDot {
  return DOTS[level];
}

// Parses strings like "3h", "30m", "1h30m", "1h 30m" into milliseconds. Returns null on invalid input.
export function parseDuration(str: string): number | null {
  const normalized = str.replace(/\s+/g, '').toLowerCase();
  const match = normalized.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
  if (!match || (!match[1] && !match[2])) return null;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  if (hours === 0 && minutes === 0) return null;
  return (hours * 60 + minutes) * 60 * 1000;
}
