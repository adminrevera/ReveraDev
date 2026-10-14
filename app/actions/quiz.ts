"use server";

import { Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { localCalendarDay } from "@/lib/local-day";
import { getStudentChapter } from "@/lib/student/content";
import { prisma } from "@/lib/prisma";
import { getReadingMinimumSeconds } from "@/lib/reading-settings";
import { getQuizValidationPercent } from "@/lib/quiz-settings";
import { measureServerOperation } from "@/lib/server-performance";

type Option = { text: string; correct: boolean; explanation: string | null };
type SupportedQuestionType = "MCQ" | "TRUE_FALSE" | "GAP" | "MATCHING";
type MatchingPair = { term: string; example: string };
type QuizLayout = { questionId: string; optionOrder: number[] };
type QuizQuestion =
  | { id: string; text: string; type: "MCQ" | "TRUE_FALSE"; choices: string[] }
  | { id: string; text: string; type: "GAP"; hint: string | null }
  | { id: string; text: string; type: "MATCHING"; terms: string[]; examples: string[] };
type QuizAnswer = number | string | number[];
const SUPPORTED_QUIZ_TYPES: SupportedQuestionType[] = ["MCQ", "TRUE_FALSE", "GAP", "MATCHING"];
type StartQuizResult =
  | { error: string }
  | { error: null; attemptId: string; questions: QuizQuestion[]; missingTypes: SupportedQuestionType[] };
type SubmitQuizResult =
  | { error: string }
  | {
      error: null;
      correct: number;
      total: number;
      percent: number;
      passed: boolean;
      validationPercent: number;
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

function optionsFromJson(value: Prisma.JsonValue): Option[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const list = value.options;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const text = entry.text;
    if (typeof text !== "string" || typeof entry.correct !== "boolean") return [];
    return [{
      text,
      correct: entry.correct,
      explanation: typeof entry.explanation === "string" ? entry.explanation : null,
    }];
  });
}

function gapDataFromJson(value: Prisma.JsonValue): { hint: string | null; answers: string[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.answers)) return null;
  const answers = value.answers.filter((answer): answer is string => typeof answer === "string" && answer.trim().length > 0);
  if (!answers.length || answers.length !== value.answers.length) return null;
  return { hint: typeof value.hint === "string" ? value.hint : null, answers };
}

function matchingPairsFromJson(value: Prisma.JsonValue): MatchingPair[] {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.pairs)) return [];
  const pairs = value.pairs.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    return typeof entry.term === "string" && entry.term.trim() &&
      typeof entry.example === "string" && entry.example.trim()
      ? [{ term: entry.term, example: entry.example }]
      : [];
  });
  return pairs.length === value.pairs.length ? pairs : [];
}

function isSupportedType(type: string): type is SupportedQuestionType {
  return type === "MCQ" || type === "TRUE_FALSE" || type === "GAP" || type === "MATCHING";
}

function isValidQuizQuestion(question: { type: string; data: Prisma.JsonValue }) {
  if (question.type === "MCQ" || question.type === "TRUE_FALSE") {
    const options = optionsFromJson(question.data);
    return options.length >= 2 && options.filter((option) => option.correct).length === 1;
  }
  if (question.type === "GAP") return gapDataFromJson(question.data) !== null;
  if (question.type === "MATCHING") return matchingPairsFromJson(question.data).length >= 2;
  return false;
}

function presentQuestion(
  question: { id: string; text: string; type: string; data: Prisma.JsonValue },
  optionOrder: number[],
): QuizQuestion {
  if (question.type === "MCQ" || question.type === "TRUE_FALSE") {
    const options = optionsFromJson(question.data);
    if (optionOrder.length !== options.length || optionOrder.some((index) => index < 0 || index >= options.length)) {
      throw new Error("L’ordre des réponses de cette tentative est invalide.");
    }
    return {
      id: question.id,
      text: question.text,
      type: question.type,
      choices: optionOrder.map((index) => options[index].text),
    };
  }
  if (question.type === "GAP") {
    const gap = gapDataFromJson(question.data);
    if (!gap || optionOrder.length) throw new Error("Les données de cette question à trous sont invalides.");
    return { id: question.id, text: question.text, type: "GAP", hint: gap.hint };
  }
  if (question.type === "MATCHING") {
    const pairs = matchingPairsFromJson(question.data);
    if (pairs.length < 2 || optionOrder.length !== pairs.length || optionOrder.some((index) => index < 0 || index >= pairs.length)) {
      throw new Error("Les associations de cette tentative sont invalides.");
    }
    return {
      id: question.id,
      text: question.text,
      type: "MATCHING",
      terms: pairs.map((pair) => pair.term),
      examples: optionOrder.map((index) => pairs[index].example),
    };
  }
  throw new Error("Ce format de question ne peut pas être présenté dans le quiz.");
}

function normalizeGapAnswer(answer: string) {
  return answer.trim().toLocaleLowerCase("fr-FR");
}

function shuffle<T>(values: T[]) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

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

export async function markChapterRead(itemIdInput: string) {
  const { profile } = await requireStudentProfile();
  const parsedId = z.string().uuid().safeParse(itemIdInput);
  if (!parsedId.success) return { error: "Ce chapitre n’est pas disponible." };
  const item = await getStudentChapter(profile, parsedId.data);
  if (!item) return { error: "Ce chapitre n’est pas encore accessible." };

  const existing = await prisma.chapterProgress.findUnique({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    select: { readAt: true, lastVisitedAt: true },
  });
  if (existing?.readAt) return { error: null };
  if (!existing) return { error: "Ouvre d’abord le chapitre pour démarrer ta lecture." };

  const minimumSeconds = await getReadingMinimumSeconds();
  const elapsedSeconds = Math.floor((Date.now() - existing.lastVisitedAt.getTime()) / 1000);
  if (elapsedSeconds < minimumSeconds) {
    const remainingSeconds = minimumSeconds - elapsedSeconds;
    return {
      error: `Continue ta lecture encore ${remainingSeconds} seconde${remainingSeconds === 1 ? "" : "s"} avant de valider.`,
    };
  }

  await prisma.chapterProgress.update({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    data: { readAt: new Date(), lastVisitedAt: new Date() },
  });
  revalidatePath(`/parcours/${item.id}`);
  return { error: null };
}

export async function startChapterReading(itemIdInput: string) {
  const { profile } = await requireStudentProfile();
  const parsedId = z.string().uuid().safeParse(itemIdInput);
  if (!parsedId.success) return { error: "Ce chapitre n’est pas disponible." };
  const item = await getStudentChapter(profile, parsedId.data);
  if (!item) return { error: "Ce chapitre n’est pas encore accessible." };

  const minimumSeconds = await getReadingMinimumSeconds();
  const startedAt = new Date();
  await prisma.chapterProgress.upsert({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    create: { userId: profile.id, itemId: item.id, lastVisitedAt: startedAt },
    update: { lastVisitedAt: startedAt },
  });
  return { error: null, minimumSeconds };
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
    where: { userId: profile.id, itemId: item.id, finishedAt: null },
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
    const includedTypes = new Set(questions.map((question) => question.type));
    return {
      error: null,
      attemptId: existing.id,
      questions,
      missingTypes: SUPPORTED_QUIZ_TYPES.filter((type) => !includedTypes.has(type)),
    };
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
    where: {
      versionId: item.publishedVersionId!,
      type: { in: ["MCQ", "TRUE_FALSE", "GAP", "MATCHING"] },
      isPlaceholder: false,
    },
    orderBy: { position: "asc" },
    select: { id: true, text: true, type: true, data: true },
  });
  const valid = candidates.filter((question) => isValidQuizQuestion(question));
  if (valid.length !== candidates.length) {
    console.error(`Chapter quiz contains invalid supported question content: item=${item.id}; invalid=${candidates.length - valid.length}`);
  }
  if (!valid.length) return { error: "Aucune question valide parmi les formats de quiz disponibles n’est présente dans ce chapitre." };

  const byType = new Map<SupportedQuestionType, typeof valid>();
  for (const question of valid) {
    if (!isSupportedType(question.type)) continue;
    byType.set(question.type, [...(byType.get(question.type) ?? []), question]);
  }
  const firstByType = [...byType.values()].flatMap((questionsOfType) => shuffle(questionsOfType).slice(0, 1));
  const firstIds = new Set(firstByType.map((question) => question.id));
  const selection = [
    ...firstByType,
    ...shuffle(valid.filter((question) => !firstIds.has(question.id))).slice(0, Math.max(0, 10 - firstByType.length)),
  ];
  const questions = shuffle(selection).map((question) => {
    const optionCount = question.type === "MCQ" || question.type === "TRUE_FALSE"
      ? optionsFromJson(question.data).length
      : question.type === "MATCHING"
        ? matchingPairsFromJson(question.data).length
        : 0;
    const optionOrder = shuffle(Array.from({ length: optionCount }, (_, index) => index));
    return {
      questionId: question.id,
      type: question.type,
      optionOrder,
      presented: presentQuestion(question, optionOrder),
    };
  });
  const includedTypes = new Set(questions.map(({ type }) => type));
  const missingTypes = SUPPORTED_QUIZ_TYPES.filter((type) => !includedTypes.has(type));
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
        data: {
          userId: profile.id,
          itemId: item.id,
          total: questions.length,
          layout: layout as Prisma.InputJsonValue,
        },
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
  return {
    error: null,
    attemptId: attempt.id,
    questions: questions.map(({ presented }) => presented),
    missingTypes,
  };
}

export async function submitChapterQuiz(attemptIdInput: string, answersInput: Record<string, QuizAnswer>): Promise<SubmitQuizResult> {
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
    where: { id: parsed.data.attemptId, userId: profile.id, finishedAt: null },
    select: { id: true, itemId: true, total: true, layout: true },
  });
  if (!attempt) return { error: "Cette tentative est introuvable ou déjà terminée." };
  const item = await getStudentChapter(profile, attempt.itemId);
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
    where: {
      id: { in: layout.map(({ questionId }) => questionId) },
      version: { itemId: attempt.itemId },
    },
    select: { id: true, key: true, text: true, type: true, data: true, explanation: true },
  });
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const results = layout.map((row) => {
    const question = questionMap.get(row.questionId);
    if (!question) throw new Error("Une question de cette tentative n’est plus disponible.");
    const submittedAnswer = parsed.data.answers[row.questionId];
    let isCorrect = false;
    let selectedText: string;
    let correctText: string;
    let storedAnswer: Prisma.InputJsonValue;

    if (question.type === "MCQ" || question.type === "TRUE_FALSE") {
      const options = optionsFromJson(question.data);
      if (
        options.length < 2 ||
        row.optionOrder.length !== options.length ||
        new Set(row.optionOrder).size !== options.length ||
        row.optionOrder.some((index) => index < 0 || index >= options.length)
      ) {
        throw new Error("L’ordre des réponses de cette tentative est invalide.");
      }
      if (typeof submittedAnswer !== "number" || submittedAnswer >= row.optionOrder.length) {
        throw new Error("Une réponse sélectionnée est invalide.");
      }
      const selectedOptionIndex = row.optionOrder[submittedAnswer];
      const correctOptionIndex = options.findIndex((option) => option.correct);
      if (correctOptionIndex < 0) throw new Error("La correction de cette question est invalide.");
      isCorrect = selectedOptionIndex === correctOptionIndex;
      selectedText = options[selectedOptionIndex].text;
      correctText = options[correctOptionIndex].text;
      storedAnswer = { choiceIndex: submittedAnswer, optionIndex: selectedOptionIndex };
    } else if (question.type === "GAP") {
      const gap = gapDataFromJson(question.data);
      if (!gap || row.optionOrder.length || typeof submittedAnswer !== "string" || !submittedAnswer.trim()) {
        throw new Error("La réponse à cette question à trous est invalide.");
      }
      isCorrect = gap.answers.some((answer) => normalizeGapAnswer(answer) === normalizeGapAnswer(submittedAnswer));
      selectedText = submittedAnswer.trim();
      correctText = gap.answers.join(" / ");
      storedAnswer = { text: submittedAnswer.trim() };
    } else if (question.type === "MATCHING") {
      const pairs = matchingPairsFromJson(question.data);
      if (
        pairs.length < 2 ||
        row.optionOrder.length !== pairs.length ||
        new Set(row.optionOrder).size !== pairs.length ||
        row.optionOrder.some((index) => index < 0 || index >= pairs.length) ||
        !Array.isArray(submittedAnswer) ||
        submittedAnswer.length !== pairs.length ||
        new Set(submittedAnswer).size !== pairs.length ||
        submittedAnswer.some((index) => index < 0 || index >= pairs.length)
      ) {
        throw new Error("Les associations envoyées pour cette question sont invalides.");
      }
      const expectedOrder = pairs.map((_, pairIndex) => row.optionOrder.indexOf(pairIndex));
      isCorrect = submittedAnswer.every((exampleIndex, termIndex) => exampleIndex === expectedOrder[termIndex]);
      selectedText = pairs.map((pair, termIndex) => `${pair.term} → ${pairs[row.optionOrder[submittedAnswer[termIndex]]].example}`).join(" · ");
      correctText = pairs.map((pair) => `${pair.term} → ${pair.example}`).join(" · ");
      storedAnswer = { exampleIndexes: submittedAnswer.map((index) => row.optionOrder[index]) };
    } else {
      throw new Error("Ce format de question ne peut pas être corrigé dans ce quiz.");
    }

    return {
      questionId: row.questionId,
      questionKey: question.key,
      text: question.text,
      isCorrect,
      selectedText,
      correctText,
      explanation: question.explanation,
      storedAnswer,
    };
  });
  const correct = results.filter((result) => result.isCorrect).length;
  const percent = Math.round((correct / attempt.total) * 100);
  const [validationPercent, tierLimits] = await Promise.all([
    getQuizValidationPercent(),
    prisma.tierLimits.findUnique({
      where: { tier: profile.tier },
      select: { spacedReview: true },
    }),
  ]);
  const finishedAt = new Date();
  const today = localCalendarDay(finishedAt, profile.timezone);
  const questDay = localCalendarDay(finishedAt, "Africa/Lome");

  await measureServerOperation("quiz.submit.transaction", () => prisma.$transaction(async (tx) => {
    const changed = await tx.quizAttempt.updateMany({
      where: { id: attempt.id, userId: profile.id, finishedAt: null },
      data: { correct, percent, finishedAt },
    });
    if (changed.count !== 1) throw new Error("Cette tentative a déjà été validée.");

    await tx.attempt.createMany({
      data: results.map((result) => {
        return {
          userId: profile.id,
          questionId: result.questionId,
          quizAttemptId: attempt.id,
          answer: result.storedAnswer,
          isCorrect: result.isCorrect,
        };
      }),
    });

    const prior = await tx.chapterProgress.findUnique({
      where: { userId_itemId: { userId: profile.id, itemId: attempt.itemId } },
      select: { completedAt: true, bestQuizScore: true },
    });
    const completed = percent >= validationPercent;
    const firstCompletion = completed && !prior?.completedAt;
    await tx.chapterProgress.upsert({
      where: { userId_itemId: { userId: profile.id, itemId: attempt.itemId } },
      create: {
        userId: profile.id,
        itemId: attempt.itemId,
        readAt: finishedAt,
        bestQuizScore: percent,
        completedAt: completed ? finishedAt : null,
        lastVisitedAt: finishedAt,
      },
      update: {
        bestQuizScore: Math.max(prior?.bestQuizScore ?? 0, percent),
        ...(completed && !prior?.completedAt ? { completedAt: finishedAt } : {}),
        lastVisitedAt: finishedAt,
      },
    });

    let xpAwarded = 0;
    if (firstCompletion) {
      const awarded = await tx.xpEvent.createMany({
        data: [{ userId: profile.id, eventKey: `chapter-complete:${attempt.itemId}`, kind: "CHAPTER_COMPLETED", amount: 25 }],
        skipDuplicates: true,
      });
      if (awarded.count) {
        xpAwarded = 25;
        await tx.profile.update({ where: { id: profile.id }, data: { xpTotal: { increment: xpAwarded } } });
      }
    }

    const streakCreated = await tx.streakDay.createMany({
      data: [{ userId: profile.id, day: today }],
      skipDuplicates: true,
    });
    if (streakCreated.count) {
      const history = await tx.streakDay.findMany({
        where: { userId: profile.id, day: { lte: today, gte: new Date(today.getTime() - 366 * 86_400_000) } },
        orderBy: { day: "desc" },
        take: 367,
        select: { day: true },
      });
      let currentStreak = 0;
      let expectedDay = today.getTime();
      for (const entry of history) {
        if (entry.day.getTime() !== expectedDay) break;
        currentStreak++;
        expectedDay -= 86_400_000;
      }
      const currentProfile = await tx.profile.findUnique({ where: { id: profile.id }, select: { bestStreak: true } });
      if (currentProfile && currentStreak > currentProfile.bestStreak) {
        await tx.profile.update({ where: { id: profile.id }, data: { bestStreak: currentStreak } });
      }
    }

    const assignedQuests = await tx.dailyQuest.findMany({
      where: { day: questDay, quest: { active: true } },
      include: { quest: { select: { id: true, metric: true, target: true, rewardXp: true } } },
    });
    for (const { quest } of assignedQuests) {
      const increment = quest.metric === "ANSWERS"
        ? attempt.total
        : quest.metric === "XP"
          ? xpAwarded
          : firstCompletion
            ? 1
            : 0;
      if (!increment) continue;
      const existingProgress = await tx.questProgress.findUnique({
        where: { userId_questId_day: { userId: profile.id, questId: quest.id, day: today } },
        select: { value: true, completedAt: true },
      });
      if (existingProgress?.completedAt) continue;
      const value = Math.min(quest.target, (existingProgress?.value ?? 0) + increment);
      const completedAt = value >= quest.target ? finishedAt : null;
      await tx.questProgress.upsert({
        where: { userId_questId_day: { userId: profile.id, questId: quest.id, day: today } },
        create: { userId: profile.id, questId: quest.id, day: today, value, completedAt },
        update: { value, completedAt },
      });
      if (completedAt && !existingProgress?.completedAt) {
        if (quest.rewardXp) {
          const awarded = await tx.xpEvent.createMany({
            data: [{
              userId: profile.id,
              eventKey: `quest-complete:${quest.id}:${today.toISOString().slice(0, 10)}`,
              kind: "QUEST_COMPLETED",
              amount: quest.rewardXp,
            }],
            skipDuplicates: true,
          });
          if (awarded.count) {
            await tx.profile.update({ where: { id: profile.id }, data: { xpTotal: { increment: quest.rewardXp } } });
          }
        }
      }
    }

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

  revalidatePath("/dashboard");
  revalidatePath("/parcours");
  revalidatePath("/quetes");
  revalidatePath("/ligue");
  revalidatePath("/reviser");
  return {
    error: null,
    correct,
    total: attempt.total,
    percent,
    passed: percent >= validationPercent,
    validationPercent,
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
