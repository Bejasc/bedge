import { describe, it, expect } from 'vitest';
import { DEFAULT_WELCOME, renderWelcomeCard, renderWelcomeText } from '../src/lib/events/welcome.js';

const vars = { userId: '42', username: 'ben', server: 'SWRPG', memberCount: 120 };

describe('renderWelcomeText', () => {
  it('fills every placeholder, repeatedly', () => {
    expect(renderWelcomeText('{user} {username} {server} #{memberCount} {user}', vars)).toBe(
      '<@42> ben SWRPG #120 <@42>',
    );
  });

  it('uses the default when unset or blank', () => {
    const expected = renderWelcomeText(DEFAULT_WELCOME, vars);
    expect(renderWelcomeText(undefined, vars)).toBe(expected);
    expect(renderWelcomeText('   ', vars)).toBe(expected);
  });
});

describe('renderWelcomeCard', () => {
  it('only pings the new member', () => {
    const card = renderWelcomeCard('hi <@42>', 'https://cdn.example/a.png', '42');
    expect(card.allowedMentions).toEqual({ users: ['42'] });
    expect(JSON.stringify(card.components[0].toJSON())).toContain('https://cdn.example/a.png');
  });
});
