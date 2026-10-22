import { secureRandom, type Random } from './logic.js';

export const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎', '7️⃣'] as const;
export type SlotSymbol = (typeof SYMBOLS)[number];

/** Relative odds per reel; rarer symbols pay more. */
const WEIGHTS: Record<SlotSymbol, number> = { '🍒': 6, '🍋': 5, '🍇': 4, '🔔': 3, '⭐': 2, '💎': 2, '7️⃣': 1 };

export const TRIPLE_PAYOUT: Record<SlotSymbol, number> = { '🍒': 2, '🍋': 2, '🍇': 3, '🔔': 4, '⭐': 5, '💎': 6, '7️⃣': 10 };
export const TWO_CHERRIES_PAYOUT = 1;

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + WEIGHTS[s], 0);

export function spinReel(random: Random = secureRandom): SlotSymbol {
  let roll = random(TOTAL_WEIGHT);
  for (const symbol of SYMBOLS) {
    roll -= WEIGHTS[symbol];
    if (roll < 0) return symbol;
  }
  return SYMBOLS[0];
}

export function spin(random: Random = secureRandom): [SlotSymbol, SlotSymbol, SlotSymbol] {
  return [spinReel(random), spinReel(random), spinReel(random)];
}

export function payout(reels: readonly SlotSymbol[]): { payout: number; label: string | null } {
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    return { payout: TRIPLE_PAYOUT[reels[0]], label: reels[0] === '7️⃣' ? 'JACKPOT' : `Three ${reels[0]}` };
  }
  if (reels.filter((r) => r === '🍒').length === 2) return { payout: TWO_CHERRIES_PAYOUT, label: 'Two 🍒' };
  return { payout: 0, label: null };
}

export const PAYTABLE_TEXT = [...SYMBOLS]
  .reverse()
  .map((s) => `${s}${s}${s} ${TRIPLE_PAYOUT[s]}`)
  .concat(`🍒🍒 ${TWO_CHERRIES_PAYOUT}`)
  .join(' · ');
