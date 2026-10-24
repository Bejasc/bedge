import { describe, it, expect } from 'vitest';
import { PAYTABLE_TEXT, SYMBOLS, TRIPLE_PAYOUT, payout, spin, spinReel } from '../src/lib/games/slots.js';

describe('spinReel', () => {
  it('maps the weighted roll onto symbols, common first', () => {
    expect(spinReel(() => 0)).toBe('🍒');
    expect(spinReel(() => 5)).toBe('🍒');
    expect(spinReel(() => 6)).toBe('🍋');
    expect(spinReel(() => 22)).toBe('7️⃣');
  });

  it('only ever lands on known symbols', () => {
    for (let i = 0; i < 500; i++) expect(SYMBOLS).toContain(spinReel());
    expect(spin()).toHaveLength(3);
  });
});

describe('payout', () => {
  it('pays three of a kind by symbol, with 7s as the jackpot', () => {
    expect(payout(['7️⃣', '7️⃣', '7️⃣'])).toEqual({ payout: TRIPLE_PAYOUT['7️⃣'], label: 'JACKPOT' });
    expect(payout(['🔔', '🔔', '🔔'])).toEqual({ payout: 4, label: 'Three 🔔' });
  });

  it('pays a small amount for two cherries', () => {
    expect(payout(['🍒', '🍋', '🍒'])).toEqual({ payout: 1, label: 'Two 🍒' });
  });

  it('pays nothing otherwise', () => {
    expect(payout(['🍒', '🍋', '🔔'])).toEqual({ payout: 0, label: null });
    expect(payout(['🔔', '🔔', '🍋'])).toEqual({ payout: 0, label: null });
  });

  it('lists the pay table from the jackpot down', () => {
    expect(PAYTABLE_TEXT.startsWith('7️⃣7️⃣7️⃣ 10')).toBe(true);
    expect(PAYTABLE_TEXT.endsWith('🍒🍒 1')).toBe(true);
  });
});
