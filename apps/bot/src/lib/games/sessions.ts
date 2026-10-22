import { randomUUID } from 'node:crypto';
import { ButtonStyle, MessageFlags, type ButtonInteraction } from 'discord.js';
import { cardLabel, compareRolls, drawCard, judgeGuess, rollDice, type Card, type Guess } from './logic.js';
import { OUTCOME_COLOUR, buttonRow, footerLine, gameCard } from './render.js';
import { awardPoints, recordHighLowRun, recordOutcome } from './service.js';

const IDLE_MS = 5 * 60 * 1000;

interface Session<T> {
  data: T;
  expires: number;
}

/** In-memory game state keyed by a short ID in the button custom IDs; it doesn't survive a restart, which is fine for games this short. */
class SessionStore<T> {
  private readonly sessions = new Map<string, Session<T>>();

  public create(data: T): string {
    this.prune();
    const id = randomUUID().slice(0, 8);
    this.sessions.set(id, { data, expires: Date.now() + IDLE_MS });
    return id;
  }

  public get(id: string): T | null {
    const s = this.sessions.get(id);
    if (!s || s.expires < Date.now()) return null;
    s.expires = Date.now() + IDLE_MS;
    return s.data;
  }

  public end(id: string): void {
    this.sessions.delete(id);
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) if (s.expires < now) this.sessions.delete(id);
  }
}

interface HighLowRun {
  guildId: string;
  userId: string;
  card: Card;
  run: number;
}

const highLow = new SessionStore<HighLowRun>();

type RunState = 'playing' | 'cashed' | 'bust';

function highLowCard(id: string, run: HighLowRun, note: string, remaining: string | null, state: RunState) {
  const lines = [`### 🃏 High/low — <@${run.userId}>`, `Current card: **${cardLabel(run.card)}**`, `Run: **${run.run}** correct`, note, footerLine([remaining])];
  const rows = state !== 'playing'
    ? []
    : [
        buttonRow([
          { id: `hl:${id}:higher`, label: 'Higher', emoji: '⬆️', style: ButtonStyle.Primary },
          { id: `hl:${id}:lower`, label: 'Lower', emoji: '⬇️', style: ButtonStyle.Primary },
          { id: `hl:${id}:cashout`, label: 'Cash out', emoji: '💰', style: ButtonStyle.Success, disabled: run.run === 0 },
        ]),
      ];
  const accent = state === 'cashed' ? OUTCOME_COLOUR.win : state === 'bust' ? OUTCOME_COLOUR.loss : undefined;
  return gameCard(lines.filter(Boolean), accent, rows);
}

export function startHighLow(guildId: string, userId: string, remaining: string | null) {
  const run: HighLowRun = { guildId, userId, card: drawCard(), run: 0 };
  const id = highLow.create(run);
  return highLowCard(id, run, 'Will the next card be higher or lower? Aces are low; a tie is a push.', remaining, 'playing');
}

export async function handleHighLow(interaction: ButtonInteraction): Promise<void> {
  const [, id, action] = interaction.customId.split(':');
  const run = highLow.get(id);
  if (!run) {
    await interaction.reply({ content: '⌛ That game has expired — start a new one with `/highlow`.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (interaction.user.id !== run.userId) {
    await interaction.reply({ content: 'This isn’t your game — start your own with `/highlow`.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === 'cashout') {
    highLow.end(id);
    await recordHighLowRun(run.guildId, run.userId, run.run, true);
    const points = await awardPoints(run.guildId, run.userId, run.run);
    await interaction.update(highLowCard(id, run, `💰 Cashed out a run of **${run.run}**${points ? ` for **${points}** points` : ''}.`, null, 'cashed'));
    return;
  }

  const next = drawCard();
  const outcome = judgeGuess(run.card, next, action as Guess);
  const previous = run.card;
  run.card = next;
  if (outcome === 'draw') {
    await interaction.update(highLowCard(id, run, `Tie with ${cardLabel(previous)} — push, keep going.`, null, 'playing'));
    return;
  }
  if (outcome === 'win') {
    run.run++;
    await interaction.update(highLowCard(id, run, `✅ ${cardLabel(next)} — correct!`, null, 'playing'));
    return;
  }
  highLow.end(id);
  await recordHighLowRun(run.guildId, run.userId, run.run, false);
  await interaction.update(highLowCard(id, run, `❌ ${cardLabel(next)} after ${cardLabel(previous)} — the run ends at **${run.run}**.`, null, 'bust'));
}

interface Duel {
  guildId: string;
  challengerId: string;
  opponentId: string;
  sides: number;
}

const duels = new SessionStore<Duel>();

export function createDuel(duel: Duel) {
  const id = duels.create(duel);
  return gameCard(
    [`### 🎲 Dice duel`, `<@${duel.challengerId}> challenges <@${duel.opponentId}> to a **d${duel.sides}** duel.`, '-# Expires in 5 minutes'],
    undefined,
    [
      buttonRow([
        { id: `duel:${id}:accept`, label: 'Accept', style: ButtonStyle.Success },
        { id: `duel:${id}:decline`, label: 'Decline', style: ButtonStyle.Danger },
      ]),
    ],
  );
}

export async function handleDuel(interaction: ButtonInteraction): Promise<void> {
  const [, id, action] = interaction.customId.split(':');
  const duel = duels.get(id);
  if (!duel) {
    await interaction.update(gameCard(['### 🎲 Dice duel', '⌛ This challenge expired.']));
    return;
  }
  if (interaction.user.id !== duel.opponentId) {
    await interaction.reply({ content: 'Only the challenged member can answer this.', flags: MessageFlags.Ephemeral });
    return;
  }
  duels.end(id);
  if (action === 'decline') {
    await interaction.update(gameCard(['### 🎲 Dice duel', `<@${duel.opponentId}> declined <@${duel.challengerId}>'s challenge.`], OUTCOME_COLOUR.draw));
    return;
  }

  const spec = { count: 1, sides: duel.sides, modifier: 0 };
  const a = rollDice(spec).total;
  const b = rollDice(spec).total;
  const outcome = compareRolls(a, b);
  await recordOutcome(duel.guildId, duel.challengerId, 'dice', outcome);
  await recordOutcome(duel.guildId, duel.opponentId, 'dice', outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw');
  const winner = outcome === 'win' ? duel.challengerId : outcome === 'loss' ? duel.opponentId : null;
  const points = winner ? await awardPoints(duel.guildId, winner, 1) : 0;
  await interaction.update(
    gameCard(
      [
        `### 🎲 Dice duel — d${duel.sides}`,
        `<@${duel.challengerId}> rolled **${a}**`,
        `<@${duel.opponentId}> rolled **${b}**`,
        winner ? `🏆 <@${winner}> wins!${points ? ` (+${points} point)` : ''}` : '🤝 A draw!',
      ],
      winner ? OUTCOME_COLOUR.win : OUTCOME_COLOUR.draw,
    ),
  );
}
