import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { container } from '@sapphire/framework';
import { BRAND_COLOUR } from '../brand.js';
import { truncate } from '../logs/render.js';
import { OUTCOME_COLOUR, footerLine } from './render.js';
import { awardPoints, recordOutcome } from './service.js';
import { DIFFICULTY_BADGE, buildRound, categoryEmoji, scoreRound, type Answer, type Question, type Round } from './trivia.js';

export const ANSWER_WINDOW_MS = 20_000;
const LETTERS = ['A', 'B', 'C', 'D'];

interface LiveQuestion {
  id: string;
  guildId: string;
  channelId: string;
  question: Question;
  round: Round;
  answers: Map<string, Answer>;
  endsAt: number;
  startedAt: number;
  offline: boolean;
  reply: ChatInputCommandInteraction;
  refresh?: NodeJS.Timeout;
  pendingEdit?: Promise<unknown>;
}

/** One live question per channel, keyed by channel ID. */
const live = new Map<string, LiveQuestion>();

export const channelBusy = (channelId: string) => live.has(channelId);

function header(q: Question): string {
  return `### ${categoryEmoji(q.category)} Trivia · ${q.category}\n-# ${DIFFICULTY_BADGE[q.difficulty]}`;
}

function answerButtons(lq: LiveQuestion, revealed: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    lq.round.answers.map((answer, i) => {
      const correct = i === lq.round.correctIndex;
      return new ButtonBuilder()
        .setCustomId(`tv:${lq.channelId}:${lq.id}:${i}`)
        .setLabel(truncate(`${LETTERS[i]} · ${answer}`, 80))
        .setStyle(revealed ? (correct ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Primary)
        .setDisabled(revealed);
    }),
  );
}

function renderLive(lq: LiveQuestion) {
  const count = lq.answers.size;
  const box = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header(lq.question)))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${lq.question.question}`))
    .addActionRowComponents(answerButtons(lq, false))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        footerLine([
          `Ends <t:${Math.floor(lq.endsAt / 1000)}:R>`,
          `🙋 ${count} answer${count === 1 ? '' : 's'}`,
          'one try each',
          lq.offline ? 'offline question set' : null,
        ]),
      ),
    );
  return { components: [box], flags: MessageFlags.IsComponentsV2 as const, allowedMentions: { parse: [] as [] } };
}

async function reveal(lq: LiveQuestion): Promise<void> {
  live.delete(lq.channelId);
  clearTimeout(lq.refresh);
  await lq.pendingEdit;
  const { correct, wrong, fastest } = scoreRound([...lq.answers.values()], lq.round.correctIndex);

  for (const a of correct) await recordOutcome(lq.guildId, a.userId, 'trivia', 'win');
  for (const a of wrong) await recordOutcome(lq.guildId, a.userId, 'trivia', 'loss');
  let fastestPoints = 0;
  for (const a of correct) {
    const added = await awardPoints(lq.guildId, a.userId, a === fastest ? 2 : 1);
    if (a === fastest) fastestPoints = added;
  }

  const seconds = (a: Answer) => ((a.at - lq.startedAt) / 1000).toFixed(1);
  const lines = [`✅ **${LETTERS[lq.round.correctIndex]} · ${lq.round.answers[lq.round.correctIndex]}**`];
  if (fastest) lines.push(`⚡ Fastest: <@${fastest.userId}> in ${seconds(fastest)}s${fastestPoints ? ` (+${fastestPoints})` : ''}`);
  if (correct.length > 1) lines.push(`🎯 Also right: ${correct.slice(1, 21).map((a) => `<@${a.userId}>`).join(' ')}`);
  if (wrong.length) lines.push(`-# ❌ ${wrong.length} wrong`);
  if (!lq.answers.size) lines.push('-# Nobody answered.');
  else if (!correct.length) lines.push('Nobody got it this time.');

  const box = new ContainerBuilder()
    .setAccentColor(correct.length ? OUTCOME_COLOUR.win : OUTCOME_COLOUR.loss)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header(lq.question)))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${lq.question.question}`))
    .addActionRowComponents(answerButtons(lq, true))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
  await lq.reply
    .editReply({ components: [box], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } })
    .catch((error: unknown) => container.logger.warn(`trivia: reveal failed — ${String(error)}`));
}

export async function startTrivia(
  interaction: ChatInputCommandInteraction<'cached'>,
  question: Question,
  offline: boolean,
): Promise<void> {
  const now = Date.now();
  const lq: LiveQuestion = {
    id: now.toString(36),
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    question,
    round: buildRound(question),
    answers: new Map(),
    endsAt: now + ANSWER_WINDOW_MS,
    startedAt: now,
    offline,
    reply: interaction,
  };
  live.set(lq.channelId, lq);
  await interaction.editReply(renderLive(lq));
  setTimeout(() => void reveal(lq), ANSWER_WINDOW_MS);
}

export async function handleTriviaAnswer(interaction: ButtonInteraction): Promise<void> {
  const [, channelId, id, rawIndex] = interaction.customId.split(':');
  const lq = live.get(channelId);
  if (!lq || lq.id !== id || Date.now() > lq.endsAt) {
    await interaction.reply({ content: '⌛ Too late — that question has closed.', flags: MessageFlags.Ephemeral });
    return;
  }
  const previous = lq.answers.get(interaction.user.id);
  if (previous) {
    await interaction.reply({ content: `You already locked in **${LETTERS[previous.index]}**.`, flags: MessageFlags.Ephemeral });
    return;
  }
  const index = Number(rawIndex);
  lq.answers.set(interaction.user.id, { userId: interaction.user.id, index, at: Date.now() });
  await interaction.reply({ content: `🔒 Locked in **${LETTERS[index]} · ${lq.round.answers[index]}**`, flags: MessageFlags.Ephemeral });

  // Answers arrive in bursts; the shared card's counter refreshes at most once a second.
  lq.refresh ??= setTimeout(() => {
    lq.refresh = undefined;
    if (live.get(lq.channelId) === lq) lq.pendingEdit = lq.reply.editReply(renderLive(lq)).catch(() => undefined);
  }, 1000);
}
