import { describe, it, expect } from 'vitest';
import { computeStoplight } from '../src/jobs/update-time-channels.js';
import type { AvailabilityWindow } from '@bedge/types';

describe('computeStoplight', () => {
  it('returns green when time falls inside a green window', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'green' }];
    // 10:00 = 600 minutes
    expect(computeStoplight(600, 1, {}, broad)).toBe('🟢');
  });

  it('correctly handles an overnight window (end < start)', () => {
    // Window: 22:00–06:00 (overnight), level yellow
    // 23:00 = 1380 minutes — should be inside the window
    const broad: AvailabilityWindow[] = [{ start: '22:00', end: '06:00', level: 'yellow' }];
    expect(computeStoplight(1380, 1, {}, broad)).toBe('🟡');
    // 05:00 = 300 minutes — also inside the overnight window
    expect(computeStoplight(300, 1, {}, broad)).toBe('🟡');
    // 07:00 = 420 minutes — outside the window
    expect(computeStoplight(420, 1, {}, broad)).toBe('🔴');
  });

  it('weekday override takes precedence over the broad layer', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'green' }];
    // Monday override: yellow window that also covers 11:00
    const weekdays = { '1': [{ start: '10:00', end: '18:00', level: 'yellow' as const }] };
    // 11:00 = 660 minutes — falls in both layers, weekday should win
    expect(computeStoplight(660, 1, weekdays, broad)).toBe('🟡');
  });

  it('returns red when no window matches in either layer', () => {
    const broad: AvailabilityWindow[] = [{ start: '09:00', end: '17:00', level: 'green' }];
    // 02:00 = 120 minutes — outside all windows
    expect(computeStoplight(120, 1, {}, broad)).toBe('🔴');
  });

  it('returns red when no availability config is present (empty arrays)', () => {
    expect(computeStoplight(600, 1, {}, [])).toBe('🔴');
  });
});
