"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { bumpQuests, awardXp, ensureDailyQuests, evaluateBadges, recordStreak } from "@/lib/gamification/engine";
import { ensureLeagueMembership } from "@/lib/gamification/league";
import { localCalendarDay } from "@/lib/local-day";
import {
  QUESTION_FORMATS, explanationFromOptions, gradeQuestion, isQuestionFormat, isValidQuestion, presentQuestion,
  randomOrder, shuffle, type AnswerValue, type PresentedQuestion,
} from "@/lib/questions";
import { getStudentChapter } from "@/lib/student/content";
import { prisma } from "@/lib/prisma";
import { getQuizValidationPercent } from "@/lib/quiz-settings";
import { measureServerOperation } from "@/lib/server-performance";

type QuizLayout = { questionId: string; optionOrder: number[] };
type StartQuizResult =
  | { error: string }
  | { error: null; attemptId: string; questions: PresentedQuestion[] };
type SubmitQuizResult =
  | { error: string }
  | {
      error: null;
      correct: number;
      total: number;
      percent: number;
      passed: boolean;
      validationPercent: number;
      newBadges: { slug: string; name: string }[];
      leagueOpened: boolean;
      results: {
        questionId: string;
        text: string;
        isCorrect: boolean;
        selectedText: string;
        correctText: string;
        explanation: string | null;
      }[];
    };

class TrainingLimitError extends Error {}

function parseLayout(value: Prisma.JsonValue): QuizLayout[] {
  if (!Array.isArray(value)) throw new Error("La tentative de quiz est invalide.");
  return value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("La tentative de quiz est invalide.");
    const questionId = row.questionId;
    const optionOrder = row.optionOrder;
    if (typeof questionId !== "string" || !Array.isArray(optionOrder)) {
      throw new Error("La tentative de quiz est invalide.");
    }
    const indexes = optionOrder.filter((index): index is number => typeof index === "number" && Number.isInteger(index));
    if (indexes.length !== optionOrder.length) throw new Error("La tentative de quiz est invalide.");
    return { questionId, optionOrder: indexes };
  });
}

export async function startChapterQuiz(itemIdInput: string): Promise<StartQuizResult> {
  const { profile } = await requireStudentProfile();
  const parsedId = z.string().uuid().safeParse(itemIdInput);
  if (!parsedId.success) return { error: "Ce chapitre n’est pas disponible." };
  const item = await getStudentChapter(profile, parsedId.data);
  if (!item) return { error: "Ce chapitre n’est pas encore accessible." };

  const progress = await prisma.chapterProgress.findUnique({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    select: { readAt: true },
  });
  if (!progress?.readAt) return { error: "Termine d’abord la lecture du chapitre." };

  const existing = await prisma.quizAttempt.findFirst({
    where: { userId: profile.id, itemId: item.id, kind: "chapter", finishedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true, layout: true },
  });
  if (existing) {
    const layout = parseLayout(existing.layout);
    const savedQuestions = await prisma.question.findMany({
      where: { id: { in: layout.map(({ questionId }) => questionId) } },
      select: { id: true, text: true, type: true, data: true },
    });
    const savedMap = new Map(savedQuestions.map((question) => [question.id, question]));
    const questions = layout.map((row) => {
      const question = savedMap.get(row.questionId);
      if (!question) throw new Error("Une question de cette tentative n’est plus disponible.");
      return presentQuestion(question, row.optionOrder);
    });
    return { error: null, attemptId: existing.id, questions };
  }

  const today = localCalendarDay(new Date(), profile.timezone);
  const tierLimits = await prisma.tierLimits.findUnique({
    where: { tier: profile.tier },
    select: { dailyTrainingSessions: true },
  });
  if (!tierLimits) throw new Error(`Les limites de l’offre ${profile.tier} ne sont pas configurées.`);
  if (tierLimits.dailyTrainingSessions !== null) {
    const usage = await prisma.usageDay.findUnique({
      where: { userId_day: { userId: profile.id, day: today } },
      select: { trainingSessions: true },
    });
    if ((usage?.trainingSessions ?? 0) >= tierLimits.dailyTrainingSessions) {
      return { error: "Tu as atteint ta limite quotidienne de séances. Réessaie demain ou consulte les offres disponibles." };
    }
  }

  const candidates = await prisma.question.findMany({
    where: { versionId: item.publishedVersionId!, type: { in: [...QUESTION_FORMATS] }, isPlaceholder: false },
    orderBy: { position: "asc" },
    select: { id: true, text: true, type: true, data: true },
  });
  const valid = candidates.filter((question) => isValidQuestion(question));
  if (valid.length !== candidates.length) {
    console.error(`Chapter quiz contains invalid question content: item=${item.id}; invalid=${candidates.length - valid.length}`);
  }
  if (!valid.length) return { error: "Aucune question valide n’est présente dans ce chapitre pour le moment." };

  // On tire d’abord une question par format disponible (variété), puis on complète au hasard jusqu’à 10.
  const byType = new Map<string, typeof valid>();
  for (const question of valid) {
    if (!isQuestionFormat(question.type)) continue;
    byType.set(question.type, [...(byType.get(question.type) ?? []), question]);
  }
  const firstByType = [...byType.values()].flatMap((questionsOfType) => shuffle(questionsOfType).slice(0, 1));
  const firstIds = new Set(firstByType.map((question) => question.id));
  const selection = [
    ...firstByType,
    ...shuffle(valid.filter((question) => !firstIds.has(question.id))).slice(0, Math.max(0, 10 - firstByType.length)),
  ];
  const questions = shuffle(selection).map((question) => {
    const optionOrder = randomOrder(question);
    return { questionId: question.id, optionOrder, presented: presentQuestion(question, optionOrder) };
  });
  const layout = questions.map(({ questionId, optionOrder }) => ({ questionId, optionOrder }));
  let attempt: { id: string };
  try {
    attempt = await prisma.$transaction(async (tx) => {
      const usage = await tx.usageDay.findUnique({
        where: { userId_day: { userId: profile.id, day: today } },
        select: { trainingSessions: true },
      });
      if (
        tierLimits.dailyTrainingSessions !== null &&
        (usage?.trainingSessions ?? 0) >= tierLimits.dailyTrainingSessions
      ) {
        throw new TrainingLimitError("Tu as atteint ta limite quotidienne de séances. Réessaie demain ou consulte les offres disponibles.");
      }
      await tx.usageDay.upsert({
        where: { userId_day: { userId: profile.id, day: today } },
        create: { userId: profile.id, day: today, trainingSessions: 1 },
        update: { trainingSessions: { increment: 1 } },
      });
      return tx.quizAttempt.create({
        data: { userId: profile.id, itemId: item.id, total: questions.length, layout: layout as Prisma.InputJsonValue },
        select: { id: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof TrainingLimitError) return { error: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "Une autre séance vient d’être ouverte. Recharge la page avant de recommencer." };
    }
    throw error;
  }
  return { error: null, attemptId: attempt.id, questions: questions.map(({ presented }) => presented) };
}

export async function submitChapterQuiz(attemptIdInput: string, answersInput: Record<string, AnswerValue>): Promise<SubmitQuizResult> {
  const { profile } = await requireStudentProfile();
  const parsed = z.object({
    attemptId: z.string().uuid(),
    answers: z.record(z.string(), z.union([
      z.number().int().min(0).max(20),
      z.string().max(500),
      z.array(z.number().int().min(0).max(20)).max(20),
    ])),
  }).safeParse({ attemptId: attemptIdInput, answers: answersInput });
  if (!parsed.success || Object.keys(parsed.data.answers).length > 10) return { error: "Les réponses envoyées sont invalides." };

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: parsed.data.attemptId, userId: profile.id, kind: "chapter", finishedAt: null },
    select: { id: true, itemId: true, total: true, layout: true },
  });
  if (!attempt) return { error: "Cette tentative est introuvable ou déjà terminée." };
  if (!attempt.itemId) return { error: "Cette tentative n’est pas un quiz de chapitre." };
  const attemptItemId = attempt.itemId;
  const item = await getStudentChapter(profile, attemptItemId);
  if (!item) return { error: "Tu n’as plus accès à ce chapitre." };
  const layout = parseLayout(attempt.layout);
  if (!layout.length || layout.length !== attempt.total || layout.length !== Object.keys(parsed.data.answers).length) {
    return { error: "Réponds à toutes les questions avant de valider." };
  }
  const layoutIds = new Set(layout.map(({ questionId }) => questionId));
  if (layoutIds.size !== layout.length || Object.keys(parsed.data.answers).some((id) => !layoutIds.has(id))) {
    return { error: "Les réponses ne correspondent pas à cette tentative." };
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: layout.map(({ questionId }) => questionId) }, version: { itemId: attemptItemId } },
    select: { id: true, key: true, text: true, type: true, data: true, explanation: true },
  });
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const results = layout.map((row) => {
    const question = questionMap.get(row.questionId);
    if (!question) throw new Error("Une question de cette tentative n’est plus disponible.");
    const graded = gradeQuestion(question, row.optionOrder, parsed.data.answers[row.questionId]);
    return {
      questionId: row.questionId,
      questionKey: question.key,
      text: question.text,
      isCorrect: graded.isCorrect,
      selectedText: graded.selectedText,
      correctText: graded.correctText,
      explanation: question.explanation ?? explanationFromOptions(question),
      storedAnswer: graded.stored,
    };
  });
  const correct = results.filter((result) => result.isCorrect).length;
  const percent = Math.round((correct / attempt.total) * 100);
  const [validationPercent, tierLimits] = await Promise.all([
    getQuizValidationPercent(),
    prisma.tierLimits.findUnique({ where: { tier: profile.tier }, select: { spacedReview: true } }),
  ]);
  const finishedAt = new Date();
  const today = localCalendarDay(finishedAt, profile.timezone);
  const questDay = localCalendarDay(finishedAt, "Africa/Lome");
  await ensureDailyQuests(questDay);

  await measureServerOperation("quiz.submit.transaction", () => prisma.$transaction(async (tx) => {
    const changed = await tx.quizAttempt.updateMany({
      where: { id: attempt.id, userId: profile.id, finishedAt: null },
      data: { correct, percent, finishedAt },
    });
    if (changed.count !== 1) throw new Error("Cette tentative a déjà été validée.");

    await tx.attempt.createMany({
      data: results.map((result) => ({
        userId: profile.id,
        questionId: result.questionId,
        quizAttemptId: attempt.id,
        answer: result.storedAnswer,
        isCorrect: result.isCorrect,
      })),
    });

    const prior = await tx.chapterProgress.findUnique({
      where: { userId_itemId: { userId: profile.id, itemId: attemptItemId } },
      select: { completedAt: true, bestQuizScore: true },
    });
    const completed = percent >= validationPercent;
    const firstCompletion = completed && !prior?.completedAt;
    await tx.chapterProgress.upsert({
      where: { userId_itemId: { userId: profile.id, itemId: attemptItemId } },
      create: {
        userId: profile.id, itemId: attemptItemId, readAt: finishedAt, bestQuizScore: percent,
        completedAt: completed ? finishedAt : null, lastVisitedAt: finishedAt,
      },
      update: {
        bestQuizScore: Math.max(prior?.bestQuizScore ?? 0, percent),
        ...(completed && !prior?.completedAt ? { completedAt: finishedAt } : {}),
        lastVisitedAt: finishedAt,
      },
    });

    const xpAwarded = firstCompletion
      ? await awardXp(tx, profile.id, `chapter-complete:${attemptItemId}`, "CHAPTER_COMPLETED", 25)
      : 0;

    await recordStreak(tx, profile.id, today);

    await bumpQuests(tx, profile.id, questDay, finishedAt, {
      ANSWERS: attempt.total,
      CORRECT: correct,
      XP: xpAwarded,
      CHAPTERS: firstCompletion ? 1 : 0,
      QUIZZES: 1,
    });

    const activeEvents = await tx.event.findMany({
      where: {
        status: "ACTIVE",
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: finishedAt } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: finishedAt } }] }],
        OR: [{ levelId: null }, ...(profile.levelId ? [{ levelId: profile.levelId }] : [])],
      },
      select: { id: true, unit: true },
    });
    for (const event of activeEvents) {
      const unit = event.unit?.toLocaleLowerCase("fr-FR") ?? "";
      const increment = unit.includes("chapitre")
        ? firstCompletion ? 1 : 0
        : unit.includes("bonne")
          ? correct
          : unit.includes("question") || unit.includes("réponse") || unit.includes("reponse")
            ? attempt.total
            : 0;
      if (!increment) continue;
      await tx.eventParticipation.upsert({
        where: { eventId_userId: { eventId: event.id, userId: profile.id } },
        create: { eventId: event.id, userId: profile.id, contribution: increment },
        update: { contribution: { increment } },
      });
    }

    if (tierLimits?.spacedReview && results.length) {
      const reviewValues = results.map((answer) =>
        Prisma.sql`(
          ${profile.id}::uuid,
          ${answer.questionKey},
          ${answer.isCorrect ? 48 : 24},
          ${finishedAt},
          ${new Date(finishedAt.getTime() + (answer.isCorrect ? 48 : 24) * 3_600_000)}
        )`,
      );
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "ReviewSchedule" ("userId", "questionKey", "halfLifeHours", "lastReviewedAt", "dueAt")
        VALUES ${Prisma.join(reviewValues)}
        ON CONFLICT ("userId", "questionKey") DO UPDATE SET
          "halfLifeHours" = CASE
            WHEN EXCLUDED."halfLifeHours" = 24 THEN 24
            ELSE LEAST("ReviewSchedule"."halfLifeHours" * 2, 720)
          END,
          "lastReviewedAt" = EXCLUDED."lastReviewedAt",
          "dueAt" = EXCLUDED."lastReviewedAt" + (
            CASE
              WHEN EXCLUDED."halfLifeHours" = 24 THEN 24
              ELSE LEAST("ReviewSchedule"."halfLifeHours" * 2, 720)
            END
          ) * interval '1 hour'
      `);
    }
  }, { timeout: 30_000 }));

  // Après la transaction (pas critique pour la correction) : ligue globale puis badges.
  let leagueOpened = false;
  let newBadges: { slug: string; name: string }[] = [];
  try {
    leagueOpened = await ensureLeagueMembership(profile.id, finishedAt);
    newBadges = await evaluateBadges(profile.id);
  } catch (error) {
    console.error("Gamification update failed after quiz:", error);
  }

  for (const path of ["/dashboard", "/parcours", "/quetes", "/ligue", "/reviser", "/profil", "/badges"]) revalidatePath(path);
  return {
    error: null,
    correct,
    total: attempt.total,
    percent,
    passed: percent >= validationPercent,
    validationPercent,
    newBadges,
    leagueOpened,
    results: results.map((answer) => ({
      questionId: answer.questionId,
      text: answer.text,
      isCorrect: answer.isCorrect,
      selectedText: answer.selectedText,
      correctText: answer.correctText,
      explanation: answer.explanation,
    })),
  };
}
