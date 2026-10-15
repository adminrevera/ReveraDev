// Jeux du jour : une grille par jour et par jeu, la même pour tout le monde (table GamePuzzle).
// - BINARY_SUDOKU : sudoku binaire 6×6 (règles : pas plus de deux 0 ou 1 de suite, autant de 0 que de 1 par ligne/colonne, lignes et colonnes toutes différentes).
// - WORDS_404 : « Mot 404 », un mot informatique de 5 lettres à trouver en 6 essais.

export const SUDOKU_SIZE = 6;
export const WORD_LENGTH = 5;
export const WORD_TRIES = 6;

export const WORDS = [
  "ROUTE", "CABLE", "PIXEL", "TABLE", "LIGNE", "ARBRE", "PROXY", "DEBUG", "SHELL", "MERGE", "CLONE", "ARRAY", "FLOAT", "BYTES", "LINUX",
  "CACHE", "TOKEN", "LOGIN", "EMAIL", "VIRUS", "MACRO", "INDEX", "VIDEO", "AUDIO", "FRAME", "SCRUM", "QUERY", "STACK", "QUEUE", "CLASS",
  "BUILD", "PATCH", "FLASH", "LOGIC", "MEDIA", "BASIC", "FORMS", "STYLE", "ALIAS", "LOOPS", "PORTS", "RAIDS",
];

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lineOk(line: (number | null)[]) {
  const half = SUDOKU_SIZE / 2;
  let zeros = 0;
  let ones = 0;
  for (let index = 0; index < line.length; index++) {
    const value = line[index];
    if (value === 0) zeros++;
    if (value === 1) ones++;
    if (index >= 2 && value !== null && value === line[index - 1] && value === line[index - 2]) return false;
  }
  return zeros <= half && ones <= half;
}

function gridOk(cells: (number | null)[], complete: boolean) {
  const n = SUDOKU_SIZE;
  const rows = Array.from({ length: n }, (_, r) => cells.slice(r * n, r * n + n));
  const cols = Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => cells[r * n + c]));
  for (const line of [...rows, ...cols]) if (!lineOk(line)) return false;
  if (complete) {
    const seen = new Set<string>();
    for (const line of rows) {
      const key = `r${line.join("")}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    for (const line of cols) {
      const key = `c${line.join("")}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
  }
  return true;
}

function solve(cells: (number | null)[], limit: number, random?: () => number) {
  const found: number[][] = [];
  const work = [...cells];
  const go = (position: number) => {
    if (found.length >= limit) return;
    if (position === work.length) {
      if (gridOk(work, true)) found.push(work.map((value) => value as number));
      return;
    }
    if (work[position] !== null) {
      go(position + 1);
      return;
    }
    const order = random && random() < 0.5 ? [1, 0] : [0, 1];
    for (const value of order) {
      work[position] = value;
      if (gridOk(work, false)) go(position + 1);
      work[position] = null;
    }
  };
  go(0);
  return found;
}

export function generateSudoku(seed: number) {
  const random = seededRandom(seed);
  const solution = solve(Array(SUDOKU_SIZE * SUDOKU_SIZE).fill(null), 1, random)[0];
  const puzzle: (number | null)[] = [...solution];
  const order = Array.from({ length: solution.length }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  let clues = solution.length;
  for (const cell of order) {
    if (clues <= 14) break;
    const saved = puzzle[cell];
    puzzle[cell] = null;
    if (solve(puzzle, 2).length === 1) clues--;
    else puzzle[cell] = saved;
  }
  return { givens: puzzle, solution };
}

export function pickWord(dayNumber: number) {
  return WORDS[Math.floor(seededRandom(dayNumber * 104729)() * WORDS.length)];
}

/** 2 = bonne lettre bien placée, 1 = lettre présente ailleurs, 0 = absente. */
export function scoreGuess(guess: string, answer: string) {
  const result = Array(guess.length).fill(0) as number[];
  const remaining = new Map<string, number>();
  for (let index = 0; index < answer.length; index++) {
    if (guess[index] === answer[index]) result[index] = 2;
    else remaining.set(answer[index], (remaining.get(answer[index]) ?? 0) + 1);
  }
  for (let index = 0; index < guess.length; index++) {
    if (result[index] === 2) continue;
    const left = remaining.get(guess[index]) ?? 0;
    if (left > 0) {
      result[index] = 1;
      remaining.set(guess[index], left - 1);
    }
  }
  return result;
}
