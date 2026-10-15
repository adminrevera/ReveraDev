"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { awardXp, bumpQuests, ensureDailyQuests, evaluateBadges, recordStreak } from "@/lib/gamification/engine";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";
import {
  QUESTION_FORMATS, explanationFromOptions, gradeQuestion, isQuestionFormat, isValidQuestion, presentQuestion, randomOrder, shuffle,
  type AnswerValue, type PresentedQuestion,
} from "@/lib/questions";

// Séances libres : révision espacée, « Mes erreurs » et banque d'entraînement (6 formats).
export type PracticeKind = "review" | "errors" | "bank";
export type PracticeStart = { error: string } | { error: null; attemptId: string; questions: PresentedQuestion[] };
export type PracticeResult =
  | { error: string }
  | {
      error: null;
      correct: number;
      total: number;
      percent: number;
      passed: boolean | null;
      validationPercent: number;
      newBadges: { slug: string; name: string }[];
      leagueOpened: boolean;
      results: { questionId: string; text: string; isCorrect: boolean; selectedText: string; correctText: string; explanation: string | null }[];
    };

const SESSION_SIZE = 10;
type Layout = { questionId: string; optionOrder: number[] };

function parseLayout(value: Prisma.JsonValue): Layout[] {
  if (!Array.isArray(value)) throw new Error("La séance est invalide.");
  return value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.questionId !== "string" || !Array.isArray(row.optionOrder)) {
      throw new Error("La séance est invalide.");
    }
    return { questionId: row.questionId, optionOrder: row.optionOrder.filter((value): value is number => typeof value === "number") };
  });
}

export async function startPractice(kindInput: PracticeKind, scopeInput?: string): Promise<PracticeStart> {
  const { profile } = await requireStudentProfile();
  const kind = z.enum(["review", "errors", "bank"]).safeParse(kindInput);
  if (!kind.success) return { error: "Cette séance n’existe pas." };
  if (!profile.levelId) return { error: "Choisis d’abord ton niveau dans ton profil." };
  const now = new Date();
  const today = localCalendarDay(now, profile.timezone);

  // Reprise d'une séance non terminée du même type.
  const open = await prisma.quizAttempt.findFirst({
    where: { userId: profile.id, kind: kind.data, finishedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true, layout: true },
  });
  if (open) {
    const layout = parseLayout(open.layout);
    const rows = await prisma.question.findMany({ where: { id: { in: layout.map((row) => row.questionId) } }, select: { id: true, text: true, type: true, data: true } });
    const map = new Map(rows.map((row) => [row.id, row]));
    if (layout.every((row) => map.has(row.questionId))) {
      return { error: null, attemptId: open.id, questions: layout.map((row) => presentQuestion(map.get(row.questionId)!, row.optionOrder)) };
    }
    await prisma.quizAttempt.delete({ where: { id: open.id } });
  }

  const tierLimits = await prisma.tierLimits.findUnique({ where: { tier: profile.tier }, select: { spacedReview: true, dailyTrainingSessions: true } });
  let questionIds: string[] = [];

  if (kind.data === "review") {
    if (!tierLimits?.spacedReview) return { error: "La révision espacée est incluse dans les offres Plus et Réussite." };
    const due = await prisma.reviewSchedule.findMany({
      where: { userId: profile.id, dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      take: SESSION_SIZE * 3,
      select: { questionKey: true },
    });
    if (!due.length) return { error: "Rien à réviser pour l’instant. Reviens quand de nouvelles fiches seront dues." };
    const rows = await prisma.question.findMany({
      where: {
        key: { in: due.map((row) => row.questionKey) },
        isPlaceholder: false,
        type: { in: [...QUESTION_FORMATS] },
        version: { status: "PUBLISHED", publishedFor: { isNot: null } },
      },
      select: { id: true, key: true, type: true, data: true },
    });
    const byKey = new Map(rows.filter((row) => isValidQuestion(row)).map((row) => [row.key, row.id]));
    questionIds = due.flatMap((row) => (byKey.has(row.questionKey) ? [byKey.get(row.questionKey)!] : [])).slice(0, SESSION_SIZE);
  } else if (kind.data === "errors") {
    const rows = await prisma.$queryRaw<{ questionId: string }[]>(Prisma.sql`
      SELECT a."questionId" FROM "Attempt" a
      WHERE a."userId" = ${profile.id}::uuid AND NOT a."isCorrect"
        AND NOT EXISTS (SELECT 1 FROM "Attempt" b WHERE b."userId" = a."userId" AND b."questionId" = a."questionId" AND b."isCorrect" AND b."answeredAt" > a."answeredAt")
      GROUP BY a."questionId" ORDER BY MAX(a."answeredAt") DESC LIMIT ${SESSION_SIZE}`);
    if (!rows.length) return { error: "Aucune erreur à retravailler. Continue comme ça !" };
    questionIds = rows.map((row) => row.questionId);
  } else {
    if (tierLimits?.dailyTrainingSessions != null) {
      const usage = await prisma.usageDay.findUnique({ where: { userId_day: { userId: profile.id, day: today } }, select: { trainingSessions: true } });
      if ((usage?.trainingSessions ?? 0) >= tierLimits.dailyTrainingSessions) {
        return { error: "Tu as atteint ta limite quotidienne de séances. Réessaie demain ou consulte les offres disponibles." };
      }
    }
    const [subjectId, format] = (scopeInput ?? "").split(":");
    const subjectFilter = z.string().uuid().safeParse(subjectId);
    const formatFilter = format && isQuestionFormat(format) ? format : null;
    const rows = await prisma.question.findMany({
      where: {
        isPlaceholder: false,
        type: formatFilter ? formatFilter : { in: [...QUESTION_FORMATS] },
        version: {
          status: "PUBLISHED",
          publishedFor: {
            is: {
              kind: "CHAPTER",
              progress: { some: { userId: profile.id, readAt: { not: null } } },
              subject: { levelId: profile.levelId, ...(subjectFilter.success ? { id: subjectFilter.data } : {}) },
            },
          },
        },
      },
      select: { id: true, type: true, data: true },
      take: 400,
    });
    const valid = rows.filter((row) => isValidQuestion(row));
    if (!valid.length) return { error: "Lis et valide d’abord quelques chapitres : la banque se remplit avec les cours que tu as lus." };
    // un peu de tout : on mélange les formats
    questionIds = shuffle(valid).slice(0, SESSION_SIZE).map((row) => row.id);
  }

  const questions = await prisma.question.findMany({ where: { id: { in: questionIds } }, select: { id: true, text: true, type: true, data: true } });
  const map = new Map(questions.map((row) => [row.id, row]));
  const ordered = shuffle(questionIds.flatMap((id) => (map.has(id) ? [map.get(id)!] : [])));
  if (!ordered.length) return { error: "Aucune question disponible pour cette séance." };
  const layout = ordered.map((question) => ({ questionId: question.id, optionOrder: randomOrder(question) }));

  const attempt = await prisma.$transaction(async (tx) => {
    if (kind.data === "bank" && tierLimits?.dailyTrainingSessions != null) {
      await tx.usageDay.upsert({
        where: { userId_day: { userId: profile.id, day: today } },
        create: { userId: profile.id, day: today, trainingSessions: 1 },
        update: { trainingSessions: { increment: 1 } },
      });
    }
    return tx.quizAttempt.create({
      data: { userId: profile.id, kind: kind.data, total: layout.length, layout: layout as Prisma.InputJsonValue },
      select: { id: true },
    });
  });
  return {
    error: null,
    attemptId: attempt.id,
    questions: layout.map((row, position) => presentQuestion(ordered[position], row.optionOrder)),
  };
}

export async function submitPractice(attemptIdInput: string, answersInput: Record<string, AnswerValue>): Promise<PracticeResult> {
  const { profile } = await requireStudentProfile();
  const parsed = z.object({
    attemptId: z.string().uuid(),
    answers: z.record(z.string(), z.union([z.number().int().min(0).max(20), z.string().max(500), z.array(z.number().int().min(0).max(20)).max(20)])),
  }).safeParse({ attemptId: attemptIdInput, answers: answersInput });
  if (!parsed.success) return { error: "Les réponses envoyées sont invalides." };

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: parsed.data.attemptId, userId: profile.id, kind: { not: "chapter" }, finishedAt: null },
    select: { id: true, kind: true, total: true, layout: true },
  });
  if (!attempt) return { error: "Cette séance est introuvable ou déjà terminée." };
  const layout = parseLayout(attempt.layout);
  if (layout.length !== attempt.total || layout.length !== Object.keys(parsed.data.answers).length) return { error: "Réponds à toutes les questions avant de terminer." };

  const rows = await prisma.question.findMany({ where: { id: { in: layout.map((row) => row.questionId) } }, select: { id: true, key: true, text: true, type: true, data: true, explanation: true } });
  const map = new Map(rows.map((row) => [row.id, row]));
  const results = layout.map((row) => {
    const question = map.get(row.questionId);
    const answer = parsed.data.answers[row.questionId];
    if (!question || answer === undefined) throw new Error("Une question de cette séance n’est plus disponible.");
    const graded = gradeQuestion(question, row.optionOrder, answer);
    return { questionId: question.id, questionKey: question.key, text: question.text, isCorrect: graded.isCorrect, selectedText: graded.selectedText, correctText: graded.correctText, explanation: question.explanation ?? explanationFromOptions(question), stored: graded.stored };
  });
  const correct = results.filter((row) => row.isCorrect).length;
  const percent = Math.round((correct / attempt.total) * 100);
  const finishedAt = new Date();
  const today = localCalendarDay(finishedAt, profile.timezone);
  const questDay = localCalendarDay(finishedAt, "Africa/Lome");
  await ensureDailyQuests(questDay);
  const tierLimits = await prisma.tierLimits.findUnique({ where: { tier: profile.tier }, select: { spacedReview: true } });

  await prisma.$transaction(async (tx) => {
    const changed = await tx.quizAttempt.updateMany({ where: { id: attempt.id, userId: profile.id, finishedAt: null }, data: { correct, percent, finishedAt } });
    if (changed.count !== 1) throw new Error("Cette séance a déjà été terminée.");
    await tx.attempt.createMany({
      data: results.map((row) => ({
        userId: profile.id,
        questionId: row.questionId,
        // les révisions sont comptées « hors quiz de chapitre » (badge Révision solide) : on ne les rattache pas au quiz
        quizAttemptId: attempt.kind === "review" ? null : attempt.id,
        answer: row.stored,
        isCorrect: row.isCorrect,
      })),
    });
    const xp = await awardXp(tx, profile.id, `practice:${attempt.id}`, "PRACTICE", correct);
    await recordStreak(tx, profile.id, today);
    await bumpQuests(tx, profile.id, questDay, finishedAt, {
      ANSWERS: attempt.total,
      CORRECT: correct,
      XP: xp,
      REVIEWS: attempt.kind === "review" ? correct : 0,
    });
    if (tierLimits?.spacedReview) {
      const values = results.map((row) => Prisma.sql`(${profile.id}::uuid, ${row.questionKey}, ${row.isCorrect ? 48 : 24}, ${finishedAt}, ${new Date(finishedAt.getTime() + (row.isCorrect ? 48 : 24) * 3_600_000)})`);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "ReviewSchedule" ("userId", "questionKey", "halfLifeHours", "lastReviewedAt", "dueAt")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("userId", "questionKey") DO UPDATE SET
          "halfLifeHours" = CASE WHEN EXCLUDED."halfLifeHours" = 24 THEN 24 ELSE LEAST("ReviewSchedule"."halfLifeHours" * 2, 720) END,
          "lastReviewedAt" = EXCLUDED."lastReviewedAt",
          "dueAt" = EXCLUDED."lastReviewedAt" + (CASE WHEN EXCLUDED."halfLifeHours" = 24 THEN 24 ELSE LEAST("ReviewSchedule"."halfLifeHours" * 2, 720) END) * interval '1 hour'
      `);
    }
  }, { timeout: 30_000 });

  let newBadges: { slug: string; name: string }[] = [];
  try {
    newBadges = await evaluateBadges(profile.id);
  } catch (error) {
    console.error("Badge evaluation failed after practice:", error);
  }
  for (const path of ["/dashboard", "/quetes", "/ligue", "/reviser", "/erreurs", "/entrainement", "/badges", "/profil"]) revalidatePath(path);
  return {
    error: null, correct, total: attempt.total, percent, passed: null, validationPercent: 0, newBadges, leagueOpened: false,
    results: results.map(({ questionId, text, isCorrect, selectedText, correctText, explanation }) => ({ questionId, text, isCorrect, selectedText, correctText, explanation })),
  };
}
