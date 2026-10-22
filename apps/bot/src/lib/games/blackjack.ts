import { cardLabel, secureRandom, type Card, type Outcome, type Random } from './logic.js';

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];

export function shuffledDeck(random: Random = secureRandom): Card[] {
  const deck: Card[] = SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Face cards count 10; aces count 11 unless that would bust, in which case 1. */
export function handValue(hand: readonly Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 1) {
      aces++;
      total += 11;
    } else {
      total += Math.min(card.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (hand: readonly Card[]) => hand.length === 2 && handValue(hand).total === 21;
export const isBust = (hand: readonly Card[]) => handValue(hand).total > 21;

/** The dealer draws until reaching 17 or more, standing on soft 17 too. */
export function playDealer(dealer: Card[], deck: Card[]): Card[] {
  const hand = [...dealer];
  while (handValue(hand).total < 17) hand.push(deck.pop()!);
  return hand;
}

export type Settlement = 'blackjack' | 'win' | 'dealer-bust' | 'push' | 'loss' | 'bust' | 'dealer-blackjack';

export function settle(player: readonly Card[], dealer: readonly Card[]): Settlement {
  const p = handValue(player).total;
  const d = handValue(dealer).total;
  if (p > 21) return 'bust';
  if (isBlackjack(player) && !isBlackjack(dealer)) return 'blackjack';
  if (isBlackjack(dealer) && !isBlackjack(player)) return 'dealer-blackjack';
  if (d > 21) return 'dealer-bust';
  if (p > d) return 'win';
  if (p < d) return 'loss';
  return 'push';
}

export const SETTLEMENT_OUTCOME: Record<Settlement, Outcome> = {
  blackjack: 'win',
  win: 'win',
  'dealer-bust': 'win',
  push: 'draw',
  loss: 'loss',
  bust: 'loss',
  'dealer-blackjack': 'loss',
};

export function settlementPoints(result: Settlement, doubled: boolean): number {
  if (result === 'blackjack') return 2;
  if (SETTLEMENT_OUTCOME[result] !== 'win') return 0;
  return doubled ? 2 : 1;
}

export const SETTLEMENT_TEXT: Record<Settlement, string> = {
  blackjack: '🃏 **Blackjack!** You win.',
  win: '✅ **You win!**',
  'dealer-bust': '💥 Dealer busts — **you win!**',
  push: '🤝 **Push.** Nobody wins.',
  loss: '❌ **Dealer wins.**',
  bust: '💥 **Bust!** Over 21.',
  'dealer-blackjack': '🃏 Dealer has **blackjack**.',
};

export function showHand(hand: readonly Card[], hideHole = false): string {
  return hand.map((c, i) => (hideHole && i === 1 ? '`🂠`' : `\`${cardLabel(c)}\``)).join(' ');
}
