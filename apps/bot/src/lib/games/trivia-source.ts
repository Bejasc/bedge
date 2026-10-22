import { container } from '@sapphire/framework';
import { secureRandom } from './logic.js';
import { FALLBACK_QUESTIONS, parseOpenTdb, type Difficulty, type Question } from './trivia.js';

const API = 'https://opentdb.com/api.php';
/** Open Trivia DB allows one request per IP every 5 seconds. */
const MIN_GAP_MS = 5_500;
const BATCH = 10;

const queues = new Map<string, Question[]>();
let lastRequest = 0;

async function fetchBatch(categoryId?: number, difficulty?: Difficulty): Promise<Question[]> {
  const wait = lastRequest + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const url = new URL(API);
  url.searchParams.set('amount', String(BATCH));
  url.searchParams.set('encode', 'url3986');
  if (categoryId) url.searchParams.set('category', String(categoryId));
  if (difficulty) url.searchParams.set('difficulty', difficulty);
  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`Open Trivia DB returned ${res.status}`);
  return parseOpenTdb(await res.json());
}

function fallback(difficulty?: Difficulty): Question {
  const pool = FALLBACK_QUESTIONS.filter((q) => !difficulty || q.difficulty === difficulty);
  return pool[secureRandom(pool.length)];
}

/** A question from Open Trivia DB, batched per category and difficulty; the bundled set covers outages. */
export async function nextQuestion(categoryId?: number, difficulty?: Difficulty): Promise<{ question: Question; offline: boolean }> {
  const key = `${categoryId ?? 'any'}:${difficulty ?? 'any'}`;
  let queue = queues.get(key);
  if (!queue?.length) {
    try {
      queue = await fetchBatch(categoryId, difficulty);
      queues.set(key, queue);
    } catch (error) {
      container.logger.warn(`trivia: falling back to bundled questions — ${String(error)}`);
    }
  }
  const question = queue?.shift();
  return question ? { question, offline: false } : { question: fallback(difficulty), offline: true };
}
