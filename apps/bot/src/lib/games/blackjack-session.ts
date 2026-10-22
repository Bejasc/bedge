import {
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type ButtonInteraction,
} from 'discord.js';
import { BRAND_COLOUR } from '../brand.js';
import { COLOURS } from '../logs/log-types.js';
import {
  SETTLEMENT_OUTCOME,
  SETTLEMENT_TEXT,
  handValue,
  isBlackjack,
  isBust,
  playDealer,
  settle,
  settlementPoints,
  showHand,
  shuffledDeck,
  type Settlement,
} from './blackjack.js';
import type { Card } from './logic.js';
import { OUTCOME_COLOUR, buttonRow, footerLine } from './render.js';
import { awardPoints, recordOutcome } from './service.js';
import { SessionStore } from './sessions.js';

export interface Hand {
  guildId: string;
  userId: string;
  deck: Card[];
  player: Card[];
  dealer: Card[];
  doubled: boolean;
}

const hands = new SessionStore<Hand>();

function totalText(cards: readonly Card[]): string {
  const { total, soft } = handValue(cards);
  return soft && total < 21 ? `${total} *(soft)*` : String(total);
}

export function renderTable(id: string, hand: Hand, result: Settlement | null, footer: (string | null)[]) {
  const dealerHidden = result === null;
  const upCard = hand.dealer[0].rank === 1 ? 11 : Math.min(hand.dealer[0].rank, 10);
  const dealerTotal = dealerHidden ? `${upCard} + ?` : totalText(hand.dealer);
  const accent =
    result === null ? BRAND_COLOUR : result === 'blackjack' ? COLOURS.yellow : OUTCOME_COLOUR[SETTLEMENT_OUTCOME[result]];

  const container = new ContainerBuilder()
    .setAccentColor(accent)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🂡 Blackjack — <@${hand.userId}>${hand.doubled ? ' · *doubled*' : ''}`))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Dealer** · ${dealerTotal}\n## ${showHand(hand.dealer, dealerHidden)}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**You** · ${totalText(hand.player)}\n## ${showHand(hand.player)}`))
    .addSeparatorComponents(new SeparatorBuilder());

  const status = result ? SETTLEMENT_TEXT[result] : 'Hit, stand, or double down?';
  const foot = footerLine(footer);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent([status, foot].filter(Boolean).join('\n')));
  if (result === null) {
    container.addActionRowComponents(
      buttonRow([
        { id: `bj:${id}:hit`, label: 'Hit', emoji: '🃏', style: ButtonStyle.Primary },
        { id: `bj:${id}:stand`, label: 'Stand', emoji: '✋', style: ButtonStyle.Secondary },
        { id: `bj:${id}:double`, label: 'Double', emoji: '⏫', style: ButtonStyle.Success, disabled: hand.player.length !== 2 },
      ]),
    );
  }
  return { components: [container], flags: MessageFlags.IsComponentsV2 as const, allowedMentions: { parse: [] as [] } };
}

async function finish(id: string, hand: Hand) {
  hands.end(id);
  if (!isBust(hand.player) && !isBlackjack(hand.player)) hand.dealer = playDealer(hand.dealer, hand.deck);
  const result = settle(hand.player, hand.dealer);
  await recordOutcome(hand.guildId, hand.userId, 'blackjack', SETTLEMENT_OUTCOME[result]);
  const points = await awardPoints(hand.guildId, hand.userId, settlementPoints(result, hand.doubled));
  return renderTable(id, hand, result, [points ? `+${points} point${points === 1 ? '' : 's'}` : null]);
}

export async function startBlackjack(guildId: string, userId: string, remaining: string | null) {
  const deck = shuffledDeck();
  const hand: Hand = { guildId, userId, deck, player: [deck.pop()!, deck.pop()!], dealer: [deck.pop()!, deck.pop()!], doubled: false };
  const id = hands.create(hand);
  if (isBlackjack(hand.player) || isBlackjack(hand.dealer)) return finish(id, hand);
  return renderTable(id, hand, null, [remaining]);
}

export async function handleBlackjack(interaction: ButtonInteraction): Promise<void> {
  const [, id, action] = interaction.customId.split(':');
  const hand = hands.get(id);
  if (!hand) {
    await interaction.reply({ content: '⌛ That hand has expired — deal a new one with `/blackjack`.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (interaction.user.id !== hand.userId) {
    await interaction.reply({ content: 'This isn’t your hand — deal your own with `/blackjack`.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === 'double' && hand.player.length === 2) {
    hand.doubled = true;
    hand.player.push(hand.deck.pop()!);
    await interaction.update(await finish(id, hand));
    return;
  }
  if (action === 'hit') {
    hand.player.push(hand.deck.pop()!);
    const total = handValue(hand.player).total;
    await interaction.update(total >= 21 ? await finish(id, hand) : renderTable(id, hand, null, []));
    return;
  }
  await interaction.update(await finish(id, hand));
}
