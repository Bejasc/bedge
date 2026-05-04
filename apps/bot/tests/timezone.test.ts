import { describe, it, expect } from 'vitest';
import { parseTimezone } from '../src/lib/timezone.js';

describe('parseTimezone', () => {
  it('parses a valid IANA string', () => {
    const result = parseTimezone('Australia/Sydney');
    expect(result).not.toBeNull();
    expect(result!.ianaZone).toBeTruthy();
    expect(result!.currentOffset).toMatch(/^UTC[+-]\d+/);
  });

  it('parses a UTC offset string', () => {
    const result = parseTimezone('UTC+9:30');
    expect(result).not.toBeNull();
    expect(result!.ianaZone).toBeTruthy();
  });

  it('parses a common alias (japan → asia/tokyo)', () => {
    const result = parseTimezone('japan');
    expect(result).not.toBeNull();
    expect(result!.ianaZone).toBeTruthy();
  });

  it('returns null for an invalid string', () => {
    expect(parseTimezone('NOTAZONE_XYZ_INVALID')).toBeNull();
  });
});
