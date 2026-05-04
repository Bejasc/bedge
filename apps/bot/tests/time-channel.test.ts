import { describe, it, expect } from 'vitest';
import { roundTo15, formatHHmm, buildChannelName } from '../src/lib/time-channel.js';

describe('roundTo15', () => {
  it.each([
    [0, 0],
    [7, 0],
    [14, 15],
    [15, 15],
    [16, 15],
    [29, 30],
    [30, 30],
    [59, 60],
  ])('roundTo15(%i) === %i', (input, expected) => {
    expect(roundTo15(input)).toBe(expected);
  });
});

describe('formatHHmm', () => {
  it('formats midnight as 00:00', () => {
    expect(formatHHmm(0)).toBe('00:00');
  });

  it('zero-pads hours and minutes', () => {
    expect(formatHHmm(65)).toBe('01:05');
  });

  it('formats a mid-day time', () => {
    expect(formatHHmm(750)).toBe('12:30');
  });

  it('formats end of day', () => {
    expect(formatHHmm(1439)).toBe('23:59');
  });
});

describe('buildChannelName', () => {
  it('builds channel name without a stoplight dot', () => {
    expect(buildChannelName('Alice', '14:00')).toBe('Alice approx time: 14:00');
  });

  it('builds channel name with a stoplight dot', () => {
    expect(buildChannelName('Alice', '14:00', '🟢')).toBe('Alice approx time: 14:00 🟢');
  });
});
