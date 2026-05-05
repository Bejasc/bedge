import { describe, it, expect } from 'vitest';
import { computeLevel, computeDefaultLevel, levelToStoplightDot } from '../src/lib/availability.js';
import type { AvailabilityWindow } from '@bedge/types';

function dot(minutes: number, day: number, broad: AvailabilityWindow[], weekdays: Record<string, AvailabilityWindow[]> = {}) {
  return levelToStoplightDot(computeLevel(minutes, day, { broad, weekdays }));
}

describe('computeLevel — custom windows', () => {
  it('returns green when time falls inside a green window', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'green' }];
    // 10:00 = 600 minutes
    expect(dot(600, 1, broad)).toBe('🟢');
  });

  it('correctly handles an overnight window (end < start)', () => {
    const broad: AvailabilityWindow[] = [{ start: '22:00', end: '06:00', level: 'yellow' }];
    // 23:00 = 1380 minutes — inside the window
    expect(dot(1380, 1, broad)).toBe('🟡');
    // 05:00 = 300 minutes — also inside the overnight window
    expect(dot(300, 1, broad)).toBe('🟡');
    // 07:00 = 420 minutes — outside the window, falls through to default (before 08:00 → red)
    expect(dot(420, 1, broad)).toBe('🔴');
  });

  it('weekday layer takes precedence over broad', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'green' }];
    const weekdays = { '1': [{ start: '10:00', end: '18:00', level: 'yellow' as const }] };
    // 11:00 = 660 minutes — falls in both layers, weekday should win
    expect(dot(660, 1, broad, weekdays)).toBe('🟡');
  });

  it('falls through to defaults when no window matches', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'green' }];
    // 02:00 = 120 minutes — outside all windows, default for midnight-8am is red
    expect(dot(120, 1, broad)).toBe('🔴');
  });
});

describe('computeDefaultLevel — default rules', () => {
  it('midnight to 08:00 is always red', () => {
    expect(computeDefaultLevel(0, 1)).toBe('red');    // 00:00 Monday
    expect(computeDefaultLevel(479, 6)).toBe('red');  // 07:59 Saturday
  });

  it('08:00–18:00 on weekdays is orange', () => {
    expect(computeDefaultLevel(480, 1)).toBe('orange');  // 08:00 Monday
    expect(computeDefaultLevel(1079, 5)).toBe('orange'); // 17:59 Friday
  });

  it('08:00–18:00 on weekends is yellow (not orange)', () => {
    expect(computeDefaultLevel(600, 0)).toBe('yellow'); // 10:00 Sunday
    expect(computeDefaultLevel(600, 6)).toBe('yellow'); // 10:00 Saturday
  });

  it('evenings and weekends outside midnight window are yellow', () => {
    expect(computeDefaultLevel(1080, 1)).toBe('yellow'); // 18:00 Monday
    expect(computeDefaultLevel(1380, 3)).toBe('yellow'); // 23:00 Wednesday
    expect(computeDefaultLevel(900, 0)).toBe('yellow');  // 15:00 Sunday
  });
});

describe('computeLevel — override', () => {
  it('active override takes precedence over windows and defaults', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'orange' }];
    const override = { level: 'green' as const, expiresAt: new Date(Date.now() + 3_600_000) };
    const level = computeLevel(600, 1, { broad, weekdays: {}, override });
    expect(level).toBe('green');
  });

  it('expired override is ignored and falls back to windows/defaults', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'orange' }];
    const override = { level: 'green' as const, expiresAt: new Date(Date.now() - 1000) };
    const level = computeLevel(600, 1, { broad, weekdays: {}, override });
    expect(level).toBe('orange'); // window matches, not the expired override
  });

  it('null config with no override applies defaults', () => {
    // 10:00 on a weekday with no config → orange (default weekday business hours)
    expect(levelToStoplightDot(computeLevel(600, 1, null))).toBe('🟠');
    // 02:00 with no config → red (default midnight rule)
    expect(levelToStoplightDot(computeLevel(120, 1, null))).toBe('🔴');
  });
});
