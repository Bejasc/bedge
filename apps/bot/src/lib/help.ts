import { ContainerBuilder, MessageFlags, SeparatorBuilder, TextDisplayBuilder } from 'discord.js';
import { BRAND_COLOUR, brandFooter } from './brand.js';
import { TIER_LABELS, tierAtLeast, type Tier } from './permissions.js';

export interface HelpEntry {
  name: string;
  description: string;
  category: string;
  tier: Tier;
  slashNames: string[];
  contextMenuNames: string[];
}

export interface HelpGroup {
  category: string;
  entries: HelpEntry[];
}

const SNOWFLAKE = /^\d{17,20}$/;

/** Sapphire's registry name sets also collect command IDs; only names belong in help. */
export function namesOnly(set: Iterable<string>): string[] {
  return [...set].filter((n) => !SNOWFLAKE.test(n));
}

export function groupHelp(entries: HelpEntry[], callerTier: Tier): HelpGroup[] {
  const groups = new Map<string, HelpEntry[]>();
  for (const entry of entries) {
    if (!tierAtLeast(callerTier, entry.tier)) continue;
    if (entry.slashNames.length === 0 && entry.contextMenuNames.length === 0) continue;
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, list]) => ({ category, entries: list.sort((a, b) => a.name.localeCompare(b.name)) }));
}

function entryLines(entry: HelpEntry): string[] {
  const badge = entry.tier === 'none' ? '' : ` · *${TIER_LABELS[entry.tier]}*`;
  const lines = entry.slashNames.map((n) => `**/${n}** — ${entry.description}${badge}`);
  for (const n of entry.contextMenuNames) lines.push(`**${n}** *(Apps menu)*${entry.slashNames.length ? '' : ` — ${entry.description}`}${badge}`);
  return lines;
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function renderHelp(groups: HelpGroup[], callerTier: Tier) {
  const container = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### 📖 BedgeBot help\n-# Showing what the **${TIER_LABELS[callerTier]}** tier can use`),
    );
  for (const group of groups) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([`**${capitalise(group.category)}**`, ...group.entries.flatMap(entryLines)].join('\n')),
    );
  }
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(brandFooter()));
  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, allowedMentions: { parse: [] as [] } };
}
