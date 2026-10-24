import { secureRandom, type Random } from './logic.js';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  category: string;
  difficulty: Difficulty;
  question: string;
  correct: string;
  incorrect: string[];
}

/** Open Trivia DB categories offered in `/trivia`; the ID is theirs. */
export const TRIVIA_CATEGORIES = [
  { id: 9, name: 'General Knowledge', emoji: '🧠' },
  { id: 11, name: 'Film', emoji: '🎬' },
  { id: 12, name: 'Music', emoji: '🎵' },
  { id: 14, name: 'Television', emoji: '📺' },
  { id: 15, name: 'Video Games', emoji: '🎮' },
  { id: 17, name: 'Science & Nature', emoji: '🔬' },
  { id: 18, name: 'Computers', emoji: '💻' },
  { id: 21, name: 'Sports', emoji: '🏅' },
  { id: 22, name: 'Geography', emoji: '🌍' },
  { id: 23, name: 'History', emoji: '🏛️' },
  { id: 27, name: 'Animals', emoji: '🐾' },
  { id: 31, name: 'Anime & Manga', emoji: '🍥' },
] as const;

export const DIFFICULTY_BADGE: Record<Difficulty, string> = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' };

export function categoryEmoji(category: string): string {
  const match = TRIVIA_CATEGORIES.find((c) => category.includes(c.name.split(' ')[0]));
  return match?.emoji ?? '🧠';
}

interface OpenTdbResult {
  category: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

/** Parses an Open Trivia DB response fetched with `encode=url3986`. */
export function parseOpenTdb(body: unknown): Question[] {
  const results = (body as { response_code?: number; results?: OpenTdbResult[] })?.results;
  if (!Array.isArray(results)) return [];
  const decode = (s: string) => decodeURIComponent(s);
  return results.flatMap((r) => {
    try {
      const difficulty = decode(r.difficulty) as Difficulty;
      return [
        {
          category: decode(r.category).replace(/^Entertainment: |^Science: /, ''),
          difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
          question: decode(r.question),
          correct: decode(r.correct_answer),
          incorrect: r.incorrect_answers.map(decode),
        },
      ];
    } catch {
      return [];
    }
  });
}

export interface Round {
  answers: string[];
  correctIndex: number;
}

/** True/False keeps its natural order; multiple choice is shuffled. */
export function buildRound(q: Question, random: Random = secureRandom): Round {
  if (q.incorrect.length === 1 && [q.correct, q.incorrect[0]].every((a) => a === 'True' || a === 'False')) {
    return { answers: ['True', 'False'], correctIndex: q.correct === 'True' ? 0 : 1 };
  }
  const answers = [q.correct, ...q.incorrect];
  for (let i = answers.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return { answers, correctIndex: answers.indexOf(q.correct) };
}

export interface Answer {
  userId: string;
  index: number;
  at: number;
}

export function scoreRound(answers: readonly Answer[], correctIndex: number) {
  const ordered = [...answers].sort((a, b) => a.at - b.at);
  const correct = ordered.filter((a) => a.index === correctIndex);
  const wrong = ordered.filter((a) => a.index !== correctIndex);
  return { correct, wrong, fastest: correct[0] ?? null };
}

export const FALLBACK_QUESTIONS: Question[] = [
  { category: 'General Knowledge', difficulty: 'easy', question: 'How many sides does a hexagon have?', correct: '6', incorrect: ['5', '7', '8'] },
  { category: 'General Knowledge', difficulty: 'easy', question: 'What colour do you get by mixing blue and yellow?', correct: 'Green', incorrect: ['Purple', 'Orange', 'Brown'] },
  { category: 'General Knowledge', difficulty: 'medium', question: 'How many players are on the field for one team in a game of rugby union?', correct: '15', incorrect: ['11', '13', '18'] },
  { category: 'Geography', difficulty: 'easy', question: 'What is the capital of Australia?', correct: 'Canberra', incorrect: ['Sydney', 'Melbourne', 'Perth'] },
  { category: 'Geography', difficulty: 'medium', question: 'Which is the longest river in the world by most measurements?', correct: 'Nile', incorrect: ['Amazon', 'Yangtze', 'Mississippi'] },
  { category: 'Geography', difficulty: 'hard', question: 'Which country has the most time zones, counting overseas territories?', correct: 'France', incorrect: ['Russia', 'United States', 'United Kingdom'] },
  { category: 'Geography', difficulty: 'easy', question: 'Mount Everest sits on the border of Nepal and which other country?', correct: 'China', incorrect: ['India', 'Bhutan', 'Pakistan'] },
  { category: 'Science & Nature', difficulty: 'easy', question: 'What gas do plants absorb from the atmosphere?', correct: 'Carbon dioxide', incorrect: ['Oxygen', 'Nitrogen', 'Helium'] },
  { category: 'Science & Nature', difficulty: 'medium', question: 'What is the chemical symbol for gold?', correct: 'Au', incorrect: ['Ag', 'Gd', 'Go'] },
  { category: 'Science & Nature', difficulty: 'medium', question: 'Which planet has the most known moons?', correct: 'Saturn', incorrect: ['Jupiter', 'Uranus', 'Neptune'] },
  { category: 'Science & Nature', difficulty: 'hard', question: 'What is the hardest natural substance on the Mohs scale?', correct: 'Diamond', incorrect: ['Corundum', 'Topaz', 'Quartz'] },
  { category: 'Science & Nature', difficulty: 'easy', question: 'Sound travels faster in water than in air.', correct: 'True', incorrect: ['False'] },
  { category: 'Computers', difficulty: 'easy', question: 'What does "CPU" stand for?', correct: 'Central Processing Unit', incorrect: ['Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'] },
  { category: 'Computers', difficulty: 'medium', question: 'In what year was the first version of JavaScript released?', correct: '1995', incorrect: ['1991', '1998', '2001'] },
  { category: 'Computers', difficulty: 'hard', question: 'Which sorting algorithm has the best average-case time complexity of these?', correct: 'Merge sort', incorrect: ['Bubble sort', 'Insertion sort', 'Selection sort'] },
  { category: 'Computers', difficulty: 'easy', question: 'HTML is a programming language.', correct: 'False', incorrect: ['True'] },
  { category: 'History', difficulty: 'easy', question: 'In which year did humans first land on the Moon?', correct: '1969', incorrect: ['1965', '1972', '1959'] },
  { category: 'History', difficulty: 'medium', question: 'Who was the first Prime Minister of Australia?', correct: 'Edmund Barton', incorrect: ['Alfred Deakin', 'Robert Menzies', 'John Curtin'] },
  { category: 'History', difficulty: 'hard', question: 'The Battle of Hastings was fought in which year?', correct: '1066', incorrect: ['1086', '1016', '1106'] },
  { category: 'Film', difficulty: 'easy', question: 'Which film features a droid called R2-D2?', correct: 'Star Wars', incorrect: ['Star Trek', 'Blade Runner', 'Alien'] },
  { category: 'Film', difficulty: 'medium', question: 'Who directed "Jurassic Park" (1993)?', correct: 'Steven Spielberg', incorrect: ['James Cameron', 'George Lucas', 'Ridley Scott'] },
  { category: 'Film', difficulty: 'hard', question: 'In "Star Wars", what is the name of the Jedi master who trained Obi-Wan Kenobi?', correct: 'Qui-Gon Jinn', incorrect: ['Mace Windu', 'Count Dooku', 'Plo Koon'] },
  { category: 'Video Games', difficulty: 'easy', question: 'What is the name of the princess Mario usually rescues?', correct: 'Peach', incorrect: ['Daisy', 'Zelda', 'Rosalina'] },
  { category: 'Video Games', difficulty: 'medium', question: 'Which company developed "Half-Life"?', correct: 'Valve', incorrect: ['id Software', 'Epic Games', 'Bungie'] },
  { category: 'Video Games', difficulty: 'hard', question: 'In "Minecraft", how many blocks of obsidian does the smallest Nether portal frame need, corners excluded?', correct: '10', incorrect: ['12', '14', '8'] },
  { category: 'Music', difficulty: 'easy', question: 'How many strings does a standard guitar have?', correct: '6', incorrect: ['4', '5', '7'] },
  { category: 'Music', difficulty: 'medium', question: 'Which band released the album "Back in Black"?', correct: 'AC/DC', incorrect: ['Led Zeppelin', 'Queen', 'Metallica'] },
  { category: 'Animals', difficulty: 'easy', question: 'A group of crows is called a murder.', correct: 'True', incorrect: ['False'] },
  { category: 'Animals', difficulty: 'medium', question: 'Which animal lays the largest eggs?', correct: 'Ostrich', incorrect: ['Emu', 'Albatross', 'Crocodile'] },
  { category: 'Sports', difficulty: 'medium', question: 'How many points is a touchdown worth in American football, before the extra point?', correct: '6', incorrect: ['3', '7', '5'] },
];
