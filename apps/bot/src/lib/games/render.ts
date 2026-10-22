import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import type { BotGame } from '@bedge/types';
import { BRAND_COLOUR } from '../brand.js';
import { COLOURS } from '../logs/log-types.js';
import type { Outcome } from './logic.js';
import { BOARD_LABELS, GAME_LABELS, type Board, type BoardRow } from './service.js';

export const OUTCOME_COLOUR: Record<Outcome, number> = { win: COLOURS.green, loss: COLOURS.red, draw: COLOURS.grey };

const v2 = { flags: MessageFlags.IsComponentsV2 as const, allowedMentions: { parse: [] as [] } };

export function gameCard(lines: string[], accent: number = BRAND_COLOUR, rows: ActionRowBuilder<ButtonBuilder>[] = []) {
  const container = new ContainerBuilder().setAccentColor(accent).addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
  for (const row of rows) container.addActionRowComponents(row);
  return { components: [container], ...v2 };
}

export function footerLine(parts: (string | null | undefined | false)[]): string {
  const text = parts.filter(Boolean).join(' · ');
  return text ? `-# ${text}` : '';
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function renderLeaderboard(board: Board, rows: BoardRow[], callerId: string, guildName: string) {
  const { title, unit } = BOARD_LABELS[board];
  const top = rows.slice(0, 10).map((r, i) => {
    const place = MEDALS[i] ?? `\`${String(i + 1).padStart(2)}\``;
    const me = r.userId === callerId ? ' ← you' : '';
    return `${place} <@${r.userId}> — **${r.value}** ${unit}${r.detail ? ` *(${r.detail})*` : ''}${me}`;
  });
  const rank = rows.findIndex((r) => r.userId === callerId);
  const yours =
    rank >= 10 ? `You're **#${rank + 1}** with ${rows[rank].value} ${unit}.` : rank === -1 ? "You're not on this board yet." : '';
  const container = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}\n-# ${guildName}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(top.length ? top.join('\n') : '*Nobody yet — be the first.*'));
  if (yours) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${yours}`));
  return { components: [container], ...v2 };
}

export interface ProfileView {
  userId: string;
  username: string;
  points: number;
  rep: number;
  pointsEnabled: boolean;
  stats: { game: BotGame; plays: number; wins: number; losses: number; draws: number; bestStreak: number }[];
}

export function renderProfile(p: ProfileView) {
  const games = (Object.keys(GAME_LABELS) as BotGame[]).map((game) => {
    const s = p.stats.find((x) => x.game === game);
    if (!s || s.plays === 0) return `**${GAME_LABELS[game]}** — not played yet`;
    const best = game === 'highlow' ? `best run ${s.bestStreak}` : `best streak ${s.bestStreak}`;
    return `**${GAME_LABELS[game]}** — ${s.wins}W ${s.losses}L${s.draws ? ` ${s.draws}D` : ''} · ${best}`;
  });
  const header = p.pointsEnabled ? `🏆 **${p.points}** points · 💖 **${p.rep}** rep` : '-# Points are off in this server';
  const container = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎮 ${p.username}\n${header}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(games.join('\n')));
  return { components: [container], ...v2 };
}

export function buttonRow(buttons: { id: string; label: string; style?: ButtonStyle; emoji?: string; disabled?: boolean }[]) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    buttons.map((b) => {
      const button = new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(b.style ?? ButtonStyle.Secondary).setDisabled(b.disabled ?? false);
      if (b.emoji) button.setEmoji(b.emoji);
      return button;
    }),
  );
}
