import { describe, it, expect } from 'vitest';
import {
  FALLBACK_QUESTIONS,
  buildRound,
  categoryEmoji,
  parseOpenTdb,
  scoreRound,
  type Question,
} from '../src/lib/games/trivia.js';

describe('parseOpenTdb', () => {
  it('decodes url3986 responses and tidies category names', () => {
    const body = {
      response_code: 0,
      results: [
        {
          type: 'multiple',
          difficulty: 'hard',
          category: 'Entertainment%3A%20Video%20Games',
          question: 'What%20is%20the%20capital%20city%20of%20Bermuda%3F',
          correct_answer: 'Hamilton',
          incorrect_answers: ['San%20Juan', 'Havana', 'Nassau'],
        },
      ],
    };
    expect(parseOpenTdb(body)).toEqual([
      {
        category: 'Video Games',
        difficulty: 'hard',
        question: 'What is the capital city of Bermuda?',
        correct: 'Hamilton',
        incorrect: ['San Juan', 'Havana', 'Nassau'],
      },
    ]);
  });

  it('returns nothing for bad responses', () => {
    expect(parseOpenTdb(null)).toEqual([]);
    expect(parseOpenTdb({ response_code: 5 })).toEqual([]);
    expect(parseOpenTdb({ results: [{ category: '%E0%A4%A', difficulty: 'easy', question: 'x', correct_answer: 'y', incorrect_answers: [] }] })).toEqual([]);
  });
});

describe('buildRound', () => {
  const q: Question = { category: 'X', difficulty: 'easy', question: 'Q', correct: 'right', incorrect: ['a', 'b', 'c'] };

  it('shuffles the answers and tracks the correct one', () => {
    const round = buildRound(q, () => 0);
    expect(round.answers).toHaveLength(4);
    expect(round.answers[round.correctIndex]).toBe('right');
    expect([...round.answers].sort()).toEqual(['a', 'b', 'c', 'right']);
  });

  it('keeps True before False', () => {
    expect(buildRound({ ...q, correct: 'False', incorrect: ['True'] })).toEqual({ answers: ['True', 'False'], correctIndex: 1 });
  });
});

describe('scoreRound', () => {
  it('orders by time and picks the fastest correct answer', () => {
    const result = scoreRound(
      [
        { userId: 'slow', index: 2, at: 300 },
        { userId: 'wrong', index: 1, at: 100 },
        { userId: 'fast', index: 2, at: 200 },
      ],
      2,
    );
    expect(result.fastest?.userId).toBe('fast');
    expect(result.correct.map((a) => a.userId)).toEqual(['fast', 'slow']);
    expect(result.wrong.map((a) => a.userId)).toEqual(['wrong']);
  });

  it('has no fastest when nobody is right', () => {
    expect(scoreRound([{ userId: 'a', index: 0, at: 1 }], 1).fastest).toBeNull();
  });
});

describe('fallback questions', () => {
  it('are well formed and cover every difficulty', () => {
    for (const q of FALLBACK_QUESTIONS) {
      expect(q.incorrect.length === 1 || q.incorrect.length === 3).toBe(true);
      expect(q.incorrect).not.toContain(q.correct);
    }
    expect(new Set(FALLBACK_QUESTIONS.map((q) => q.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']));
  });
});

describe('categoryEmoji', () => {
  it('matches known categories and falls back to a brain', () => {
    expect(categoryEmoji('Video Games')).toBe('🎮');
    expect(categoryEmoji('Japanese Anime & Manga')).toBe('🍥');
    expect(categoryEmoji('Mythology')).toBe('🧠');
  });
});
