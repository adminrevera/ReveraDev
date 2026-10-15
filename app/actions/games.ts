"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { awardXp, bumpQuests, ensureDailyQuests, evaluateBadges, recordStreak } from "@/lib/gamification/engine";
import { generateSudoku, pickWord, scoreGuess, SUDOKU_SIZE, WORD_LENGTH, WORD_TRIES } from "@/lib/games";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";

type Kind = "BINARY_SUDOKU" | "WORDS_404";
const GAME_XP = 20;

async function loadPuzzle(kind: Kind, day: Date) {
  const dayNumber = Math.floor(day.getTime() / 86_400_000);
  const existing = await prisma.gamePuzzle.findUnique({ where: { kind_day: { kind, day } } });
  if (existing) return existing;
  const data = kind === "BINARY_SUDOKU"
    ? (() => { const grid = generateSudoku(dayNumber * 31 + 7); return { data: { size: SUDOKU_SIZE, givens: grid.givens }, solution: { cells: grid.solution } }; })()
    : { data: { length: WORD_LENGTH, tries: WORD_TRIES }, solution: { word: pickWord(dayNumber) } };
  await prisma.gamePuzzle.createMany({ data: [{ kind, day, data: data.data, solution: data.solution }], skipDuplicates: true });
  return prisma.gamePuzzle.findUniqueOrThrow({ where: { kind_day: { kind, day } } });
}

/** Ouvre (ou reprend) la partie du jour. Applique la limite quotidienne de jeux de l'offre. */
export async function openTodayGame(kindInput: Kind) {
  const { profile } = await requireStudentProfile();
  const kind = z.enum(["BINARY_SUDOKU", "WORDS_404"]).parse(kindInput);
  const now = new Date();
  const day = localCalendarDay(now, "Africa/Lome");
  const puzzle = await loadPuzzle(kind, day);
  let session = await prisma.gameSession.findUnique({ where: { userId_puzzleId: { userId: profile.id, puzzleId: puzzle.id } } });
  if (!session) {
    const [limits, usage] = await Promise.all([
      prisma.tierLimits.findUnique({ where: { tier: profile.tier }, select: { dailyGames: true } }),
      prisma.usageDay.findUnique({ where: { userId_day: { userId: profile.id, day: localCalendarDay(now, profile.timezone) } }, select: { games: true } }),
    ]);
    if (limits?.dailyGames != null && (usage?.games ?? 0) >= limits.dailyGames) {
      return { error: "Tu as atteint ta limite de jeux pour aujourd’hui. Reviens demain ou consulte les offres." } as const;
    }
    const today = localCalendarDay(now, profile.timezone);
    await prisma.usageDay.upsert({
      where: { userId_day: { userId: profile.id, day: today } },
      create: { userId: profile.id, day: today, games: 1 },
      update: { games: { increment: 1 } },
    });
    session = await prisma.gameSession.create({ data: { userId: profile.id, puzzleId: puzzle.id } });
  }
  const state = (session.state ?? {}) as { guesses?: string[] };
  const guesses = (state.guesses ?? []).map((guess) => ({ guess, score: scoreGuess(guess, (puzzle.solution as { word: string }).word ?? "") }));
  return {
    error: null,
    finished: session.finishedAt !== null,
    success: session.success,
    seconds: session.seconds,
    givens: kind === "BINARY_SUDOKU" ? ((puzzle.data as { givens: (number | null)[] }).givens) : null,
    guesses: kind === "WORDS_404" ? guesses : [],
    answer: kind === "WORDS_404" && session.finishedAt ? (puzzle.solution as { word: string }).word : null,
  } as const;
}

async function finishSession(userId: string, timezone: string, sessionId: string, success: boolean, startedAt: Date) {
  const now = new Date();
  const seconds = Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 1000));
  await ensureDailyQuests(localCalendarDay(now, "Africa/Lome"));
  await prisma.$transaction(async (tx) => {
    const changed = await tx.gameSession.updateMany({ where: { id: sessionId, finishedAt: null }, data: { finishedAt: now, success, seconds } });
    if (!changed.count) return;
    await recordStreak(tx, userId, localCalendarDay(now, timezone));
    if (success) await awardXp(tx, userId, `game:${sessionId}`, "GAME", GAME_XP);
    await bumpQuests(tx, userId, localCalendarDay(now, "Africa/Lome"), now, { GAMES: 1, XP: success ? GAME_XP : 0 });
  });
  const badges = await evaluateBadges(userId, ["games_finished"]).catch(() => []);
  for (const path of ["/jeux", "/dashboard", "/quetes", "/badges", "/ligue"]) revalidatePath(path);
  return { seconds, badges };
}

export async function submitSudoku(cellsInput: number[]) {
  const { profile } = await requireStudentProfile();
  const parsed = z.array(z.number().int().min(0).max(1)).length(SUDOKU_SIZE * SUDOKU_SIZE).safeParse(cellsInput);
  if (!parsed.success) return { error: "La grille est incomplète." } as const;
  const day = localCalendarDay(new Date(), "Africa/Lome");
  const puzzle = await loadPuzzle("BINARY_SUDOKU", day);
  const session = await prisma.gameSession.findUnique({ where: { userId_puzzleId: { userId: profile.id, puzzleId: puzzle.id } } });
  if (!session) return { error: "Ouvre d’abord la partie." } as const;
  if (session.finishedAt) return { error: "Cette grille est déjà terminée." } as const;
  const solution = (puzzle.solution as { cells: number[] }).cells;
  const correct = parsed.data.every((value, index) => value === solution[index]);
  if (!correct) return { error: null, correct: false } as const;
  const done = await finishSession(profile.id, profile.timezone, session.id, true, session.startedAt);
  return { error: null, correct: true, seconds: done.seconds, badges: done.badges } as const;
}

export async function submitWordGuess(guessInput: string) {
  const { profile } = await requireStudentProfile();
  const parsed = z.string().trim().toUpperCase().regex(/^[A-Z]{5}$/).safeParse(guessInput);
  if (!parsed.success) return { error: "Entre un mot de 5 lettres." } as const;
  const day = localCalendarDay(new Date(), "Africa/Lome");
  const puzzle = await loadPuzzle("WORDS_404", day);
  const session = await prisma.gameSession.findUnique({ where: { userId_puzzleId: { userId: profile.id, puzzleId: puzzle.id } } });
  if (!session) return { error: "Ouvre d’abord la partie." } as const;
  if (session.finishedAt) return { error: "Cette partie est déjà terminée." } as const;
  const answer = (puzzle.solution as { word: string }).word;
  const guesses = ((session.state as { guesses?: string[] } | null)?.guesses ?? []).concat(parsed.data);
  await prisma.gameSession.update({ where: { id: session.id }, data: { state: { guesses } } });
  const score = scoreGuess(parsed.data, answer);
  const won = parsed.data === answer;
  const over = won || guesses.length >= WORD_TRIES;
  let seconds: number | null = null;
  let badges: { slug: string; name: string }[] = [];
  if (over) {
    const done = await finishSession(profile.id, profile.timezone, session.id, won, session.startedAt);
    seconds = done.seconds;
    badges = done.badges;
  }
  return { error: null, score, won, over, answer: over ? answer : null, seconds, badges } as const;
}
