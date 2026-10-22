import { describe, it, expect } from 'vitest';
import type { Card } from '../src/lib/games/logic.js';
import {
  handValue,
  isBlackjack,
  playDealer,
  settle,
  settlementPoints,
  showHand,
  shuffledDeck,
} from '../src/lib/games/blackjack.js';
import { renderTable, type Hand } from '../src/lib/games/blackjack-session.js';

const c = (rank: number, suit: Card['suit'] = '♠'): Card => ({ rank, suit });

describe('shuffledDeck', () => {
  it('has 52 distinct cards', () => {
    const deck = shuffledDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((x) => `${x.rank}${x.suit}`)).size).toBe(52);
  });
});

describe('handValue', () => {
  it('counts faces as 10', () => {
    expect(handValue([c(13), c(12)])).toEqual({ total: 20, soft: false });
  });

  it('counts an ace as 11 until it would bust', () => {
    expect(handValue([c(1), c(6)])).toEqual({ total: 17, soft: true });
    expect(handValue([c(1), c(6), c(10)])).toEqual({ total: 17, soft: false });
    expect(handValue([c(1), c(1), c(9)])).toEqual({ total: 21, soft: true });
    expect(handValue([c(1), c(1), c(1), c(1)])).toEqual({ total: 14, soft: true });
  });

  it('spots blackjack', () => {
    expect(isBlackjack([c(1), c(11)])).toBe(true);
    expect(isBlackjack([c(7), c(7), c(7)])).toBe(false);
  });
});

describe('playDealer', () => {
  it('draws to 17 and stands on soft 17', () => {
    expect(playDealer([c(10), c(6)], [c(5)]).map((x) => x.rank)).toEqual([10, 6, 5]);
    expect(playDealer([c(1), c(6)], [c(5)]).map((x) => x.rank)).toEqual([1, 6]);
  });
});

describe('settle', () => {
  it('handles every result', () => {
    expect(settle([c(1), c(13)], [c(10), c(9)])).toBe('blackjack');
    expect(settle([c(1), c(13)], [c(1), c(12)])).toBe('push');
    expect(settle([c(10), c(9)], [c(1), c(12)])).toBe('dealer-blackjack');
    expect(settle([c(10), c(9), c(5)], [c(10), c(7)])).toBe('bust');
    expect(settle([c(10), c(9)], [c(10), c(6), c(9)])).toBe('dealer-bust');
    expect(settle([c(10), c(9)], [c(10), c(7)])).toBe('win');
    expect(settle([c(10), c(6)], [c(10), c(7)])).toBe('loss');
    expect(settle([c(10), c(7)], [c(9), c(8)])).toBe('push');
  });

  it('pays points by result and double', () => {
    expect(settlementPoints('blackjack', false)).toBe(2);
    expect(settlementPoints('win', false)).toBe(1);
    expect(settlementPoints('dealer-bust', true)).toBe(2);
    expect(settlementPoints('push', true)).toBe(0);
    expect(settlementPoints('bust', true)).toBe(0);
  });
});

describe('showHand', () => {
  it('hides the dealer hole card', () => {
    expect(showHand([c(1, '♥'), c(13, '♣')], true)).toBe('`A♥` `🂠`');
    expect(showHand([c(10, '♦')])).toBe('`10♦`');
  });
});

describe('renderTable', () => {
  const hand: Hand = { guildId: 'g', userId: 'u', deck: [], player: [c(1, '♥'), c(6)], dealer: [c(13, '♣'), c(9)], doubled: false };

  it('hides the hole card and offers actions while playing', () => {
    const json = JSON.stringify(renderTable('x', hand, null, []).components[0].toJSON());
    expect(json).toContain('**Dealer** · 10 + ?');
    expect(json).toContain('`🂠`');
    expect(json).toContain('17 *(soft)*');
    expect(json).toContain('bj:x:double');
  });

  it('shows both hands and the result once settled', () => {
    const card = renderTable('x', { ...hand, player: [c(10), c(10)] }, 'win', ['+1 point']).components[0].toJSON();
    const json = JSON.stringify(card);
    expect(json).toContain('`K♣` `9♠`');
    expect(json).toContain('You win');
    expect(json).not.toContain('bj:x:hit');
    expect(card.accent_color).toBe(0x57f287);
  });
});
