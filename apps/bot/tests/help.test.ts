import { describe, it, expect } from 'vitest';
import { groupHelp, namesOnly, type HelpEntry } from '../src/lib/help.js';

function entry(name: string, tier: HelpEntry['tier'], category = 'general'): HelpEntry {
  return { name, description: `${name} desc`, category, tier, slashNames: [name], contextMenuNames: [] };
}

const entries = [
  entry('ping', 'none'),
  entry('purge', 'mod', 'moderation'),
  entry('config', 'admin', 'admin'),
  entry('eval', 'owner', 'owner'),
];

describe('groupHelp', () => {
  it('shows a mod only mod and public commands', () => {
    const names = groupHelp(entries, 'mod').flatMap((g) => g.entries.map((e) => e.name));
    expect(names.sort()).toEqual(['ping', 'purge']);
  });

  it('shows the owner everything', () => {
    expect(groupHelp(entries, 'owner').flatMap((g) => g.entries)).toHaveLength(4);
  });

  it('groups by category in alphabetical order', () => {
    expect(groupHelp(entries, 'owner').map((g) => g.category)).toEqual(['admin', 'general', 'moderation', 'owner']);
  });

  it('drops commands with nothing registered', () => {
    expect(groupHelp([{ ...entry('ghost', 'none'), slashNames: [] }], 'owner')).toEqual([]);
  });
});

describe('namesOnly', () => {
  it('filters out command IDs', () => {
    expect(namesOnly(['ping', '123456789012345678'])).toEqual(['ping']);
  });
});
