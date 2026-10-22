import { describe, it, expect } from 'vitest';
import {
  countStars,
  decideStarAction,
  displayEmoji,
  emojiMatches,
  parseEmojiInput,
  pickImage,
} from '../src/lib/starboard/logic.js';
import { renderStarCard } from '../src/lib/starboard/render.js';

describe('parseEmojiInput', () => {
  it('accepts unicode emoji', () => {
    expect(parseEmojiInput('⭐')).toBe('⭐');
    expect(parseEmojiInput(' 🔥 ')).toBe('🔥');
    expect(parseEmojiInput('🇦🇺')).toBe('🇦🇺');
  });

  it('reduces custom emoji to their ID', () => {
    expect(parseEmojiInput('<:pog:123456789012345678>')).toBe('123456789012345678');
    expect(parseEmojiInput('<a:dance:123456789012345678>')).toBe('123456789012345678');
    expect(parseEmojiInput('pog:123456789012345678')).toBe('123456789012345678');
    expect(parseEmojiInput('123456789012345678')).toBe('123456789012345678');
  });

  it('rejects text', () => {
    expect(parseEmojiInput('star')).toBeNull();
    expect(parseEmojiInput('')).toBeNull();
    expect(parseEmojiInput('⭐ ⭐')).toBeNull();
  });
});

describe('emoji matching and display', () => {
  it('matches unicode by name and custom by ID', () => {
    expect(emojiMatches('⭐', { id: null, name: '⭐' })).toBe(true);
    expect(emojiMatches('123456789012345678', { id: '123456789012345678', name: 'pog' })).toBe(true);
    expect(emojiMatches('⭐', { id: '123456789012345678', name: '⭐' })).toBe(false);
  });

  it('renders custom IDs as emoji markup', () => {
    expect(displayEmoji('123456789012345678')).toBe('<:star:123456789012345678>');
    expect(displayEmoji('⭐')).toBe('⭐');
  });
});

describe('countStars', () => {
  const reactors = [
    { id: 'author', bot: false },
    { id: 'a', bot: false },
    { id: 'b', bot: false },
    { id: 'bot', bot: true },
  ];

  it('ignores bots and, by default, the author', () => {
    expect(countStars(reactors, 'author', false)).toBe(2);
    expect(countStars(reactors, 'author', true)).toBe(3);
  });
});

describe('decideStarAction', () => {
  it('posts at the threshold, updates above it and removes below it', () => {
    expect(decideStarAction(3, 3, false, 0)).toBe('post');
    expect(decideStarAction(4, 3, true, 3)).toBe('update');
    expect(decideStarAction(4, 3, true, 4)).toBe('none');
    expect(decideStarAction(2, 3, true, 3)).toBe('remove');
    expect(decideStarAction(2, 3, false, 0)).toBe('none');
  });
});

describe('pickImage', () => {
  it('prefers an image attachment, then embed images', () => {
    expect(pickImage({ attachments: [{ url: 'a.txt', contentType: 'text/plain' }, { url: 'b.png', contentType: 'image/png' }], embedImages: ['c.png'] })).toBe('b.png');
    expect(pickImage({ attachments: [], embedImages: [undefined, 'c.png'] })).toBe('c.png');
    expect(pickImage({ attachments: [], embedImages: [] })).toBeUndefined();
  });
});

describe('renderStarCard', () => {
  it('builds a valid card with count, image and jump link', () => {
    const json = JSON.stringify(
      renderStarCard({
        authorId: '1',
        authorName: 'ben',
        authorAvatarUrl: 'https://cdn.example/a.png',
        content: 'x'.repeat(5000),
        imageUrl: 'https://cdn.example/i.png',
        count: 5,
        emojiKey: '⭐',
        channelId: '2',
        url: 'https://discord.com/channels/1/2/3',
        createdAt: new Date(0),
      }).components[0].toJSON(),
    );
    expect(json).toContain('⭐ **5**');
    expect(json).toContain('https://cdn.example/i.png');
    expect(json).toContain('Jump to message');
    expect(json).toContain('(truncated)');
  });
});
