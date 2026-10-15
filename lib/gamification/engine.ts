import { Prisma, type QuestMetric } from "@prisma/client";
import catalog from "@/data/_gamification.json";
import { getAppSetting } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export type Tx = Prisma.TransactionClient;

// ───────────── Catalogue (badges + réserve de quêtes) ─────────────

/** Ajoute à la base les badges et quêtes du catalogue qui n'y sont pas encore. Ne modifie jamais l'existant. */
export async function installGamificationCatalog() {
  const badges = await prisma.badge.createMany({
    data: catalog.badges.map((badge) => ({
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      category: badge.category as "DISCOVERY" | "REGULARITY" | "MASTERY" | "COMPETITION" | "EVENT",
      position: badge.position,
      rule: badge.rule as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
  const quests = await prisma.questDefinition.createMany({
    data: catalog.quests.map((quest) => ({
      slug: quest.slug,
      title: quest.title,
      metric: quest.metric as QuestMetric,
      target: quest.target,
      rewardXp: quest.rewardXp,
    })),
    skipDuplicates: true,
  });
  return { badges: badges.count, quests: quests.count };
}

// ───────────── XP ─────────────

/** Donne de l'XP une seule fois par clé. Met aussi à jour l'XP de la semaine en ligue. Retourne l'XP réellement donnée. */
export async function awardXp(tx: Tx, userId: string, eventKey: string, kind: string, amount: number) {
  if (amount <= 0) return 0;
  const created = await tx.xpEvent.createMany({ data: [{ userId, eventKey, kind, amount }], skipDuplicates: true });
  if (!created.count) return 0;
  await tx.profile.update({ where: { id: userId }, data: { xpTotal: { increment: amount } } });
  await tx.leagueMember.updateMany({
    where: { userId, group: { week: { closedAt: null } } },
    data: { weekXp: { increment: amount } },
  });
  return amount;
}

/** Enregistre le jour d'activité et met à jour le record de série. */
export async function recordStreak(tx: Tx, userId: string, today: Date) {
  const created = await tx.streakDay.createMany({ data: [{ userId, day: today }], skipDuplicates: true });
  if (!created.count) return;
  const history = await tx.streakDay.findMany({
    where: { userId, day: { lte: today, gte: new Date(today.getTime() - 366 * 86_400_000) } },
    orderBy: { day: "desc" },
    take: 367,
    select: { day: true },
  });
  let current = 0;
  let expected = today.getTime();
  for (const entry of history) {
    if (entry.day.getTime() !== expected) break;
    current++;
    expected -= 86_400_000;
  }
  const profile = await tx.profile.findUnique({ where: { id: userId }, select: { bestStreak: true } });
  if (profile && current > profile.bestStreak) await tx.profile.update({ where: { id: userId }, data: { bestStreak: current } });
}

// ───────────── Quêtes ─────────────

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickQuests<T extends { metric: string }>(pool: T[], count: number, day: Date) {
  const random = seeded(Math.floor(day.getTime() / 86_400_000) * 2654435761);
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  const picked: T[] = [];
  const metrics = new Set<string>();
  for (const quest of shuffled) {
    if (picked.length >= count) break;
    if (metrics.has(quest.metric)) continue;
    metrics.add(quest.metric);
    picked.push(quest);
  }
  for (const quest of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(quest)) picked.push(quest);
  }
  return picked;
}

/** Tire les quêtes du jour dans la réserve (une fois par jour, identiques pour tous). */
export async function ensureDailyQuests(day: Date) {
  if ((await prisma.dailyQuest.count({ where: { day } })) > 0) return;
  const read = () => prisma.questDefinition.findMany({ where: { active: true }, orderBy: { slug: "asc" }, select: { id: true, metric: true } });
  let pool = await read();
  if (!pool.length) {
    await installGamificationCatalog();
    pool = await read();
  }
  if (!pool.length) return;
  const setting = await getAppSetting("quests.perDay");
  const count = typeof setting === "number" && setting >= 1 ? Math.min(Math.floor(setting), 8) : 3;
  await prisma.dailyQuest.createMany({
    data: pickQuests(pool, count, day).map((quest) => ({ day, questId: quest.id })),
    skipDuplicates: true,
  });
}

export type QuestDeltas = Partial<Record<QuestMetric, number>>;

/** Fait avancer les quêtes du jour. Donne la récompense XP à la première complétion. */
export async function bumpQuests(tx: Tx, userId: string, day: Date, now: Date, deltas: QuestDeltas) {
  const assigned = await tx.dailyQuest.findMany({
    where: { day, quest: { active: true } },
    select: { quest: { select: { id: true, title: true, metric: true, target: true, rewardXp: true } } },
  });
  const completed: string[] = [];
  for (const { quest } of assigned) {
    const increment = deltas[quest.metric] ?? 0;
    if (increment <= 0) continue;
    const existing = await tx.questProgress.findUnique({
      where: { userId_questId_day: { userId, questId: quest.id, day } },
      select: { value: true, completedAt: true },
    });
    if (existing?.completedAt) continue;
    const value = Math.min(quest.target, (existing?.value ?? 0) + increment);
    const completedAt = value >= quest.target ? now : null;
    await tx.questProgress.upsert({
      where: { userId_questId_day: { userId, questId: quest.id, day } },
      create: { userId, questId: quest.id, day, value, completedAt },
      update: { value, completedAt },
    });
    if (completedAt) {
      completed.push(quest.title);
      await awardXp(tx, userId, `quest-complete:${quest.id}:${day.toISOString().slice(0, 10)}`, "QUEST_COMPLETED", quest.rewardXp);
    }
  }
  return completed;
}

// ───────────── Badges ─────────────

type Rule = { metric: string; threshold: number };

function parseRule(value: Prisma.JsonValue | null): Rule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { metric, threshold } = value as Record<string, unknown>;
  return typeof metric === "string" && typeof threshold === "number" ? { metric, threshold } : null;
}

export const BADGE_METRICS = [
  "chapters_read", "quizzes_finished", "chapters_validated", "subjects_started", "exams_finished", "games_finished", "league_joined",
  "streak_days", "quests_completed", "full_quest_days", "first_try_validations", "correct_answers", "subjects_completed", "subjects_completed_all",
  "errors_cleared", "reviews_passed", "exam_pass", "exam_perfect", "formats_succeeded", "league_promotions", "league_podiums",
  "league_firsts", "league_tier_reached", "events_joined", "team_events_won", "solo_events_won",
] as const;

function metricReaders(userId: string): Record<string, () => Promise<number>> {
  const completedIds = async () =>
    (await prisma.chapterProgress.findMany({ where: { userId, completedAt: { not: null } }, select: { itemId: true } })).map((row) => row.itemId);
  const scalar = async (query: Prisma.Sql) => {
    const rows = await prisma.$queryRaw<{ n: bigint }[]>(query);
    return Number(rows[0]?.n ?? 0);
  };
  const sql = Prisma.sql;
  let info: Promise<{ full: number; allDone: number }> | undefined;
  const subjectsInfo = () => (info ??= loadSubjectsInfo());
  const loadSubjectsInfo = async () => {
    const [profile, subjects, done] = await Promise.all([
      prisma.profile.findUnique({ where: { id: userId }, select: { levelId: true } }),
      prisma.subject.findMany({
        where: { visibility: { in: ["PUBLIC", "PREMIUM"] } },
        select: { id: true, levelId: true, items: { where: { kind: "CHAPTER", publishedVersionId: { not: null } }, select: { id: true } } },
      }),
      completedIds(),
    ]);
    const doneSet = new Set(done);
    const full = subjects.filter((subject) => subject.items.length > 0 && subject.items.every((item) => doneSet.has(item.id)));
    const ofLevel = subjects.filter((subject) => subject.levelId === profile?.levelId && subject.items.length > 0);
    return { full: full.length, allDone: ofLevel.length > 0 && ofLevel.every((subject) => full.some((f) => f.id === subject.id)) ? 1 : 0 };
  };
  const examScores = async () =>
    (await prisma.examAttempt.findMany({ where: { userId, finishedAt: { not: null } }, select: { score: true, maxScore: true }, take: 500 }))
      .map((row) => ({ score: Number(row.score), max: Number(row.maxScore) }));
  return {
    chapters_read: () => prisma.chapterProgress.count({ where: { userId, readAt: { not: null } } }),
    quizzes_finished: () => prisma.quizAttempt.count({ where: { userId, kind: "chapter", finishedAt: { not: null } } }),
    chapters_validated: () => prisma.chapterProgress.count({ where: { userId, completedAt: { not: null } } }),
    subjects_started: () => scalar(sql`SELECT COUNT(DISTINCT ci."subjectId") AS n FROM "ChapterProgress" cp JOIN "ContentItem" ci ON ci.id = cp."itemId" WHERE cp."userId" = ${userId}::uuid AND cp."completedAt" IS NOT NULL`),
    exams_finished: () => prisma.examAttempt.count({ where: { userId, finishedAt: { not: null } } }),
    games_finished: () => prisma.gameSession.count({ where: { userId, finishedAt: { not: null } } }),
    league_joined: () => prisma.leagueMember.count({ where: { userId } }),
    streak_days: async () => (await prisma.profile.findUnique({ where: { id: userId }, select: { bestStreak: true } }))?.bestStreak ?? 0,
    quests_completed: () => prisma.questProgress.count({ where: { userId, completedAt: { not: null } } }),
    full_quest_days: () => scalar(sql`SELECT COUNT(*) AS n FROM (SELECT qp."day" FROM "QuestProgress" qp WHERE qp."userId" = ${userId}::uuid AND qp."completedAt" IS NOT NULL GROUP BY qp."day" HAVING COUNT(*) >= (SELECT COUNT(*) FROM "DailyQuest" dq WHERE dq."day" = qp."day")) t`),
    first_try_validations: () => scalar(sql`SELECT COUNT(*) AS n FROM "ChapterProgress" cp WHERE cp."userId" = ${userId}::uuid AND cp."completedAt" IS NOT NULL AND (SELECT COUNT(*) FROM "QuizAttempt" qa WHERE qa."userId" = cp."userId" AND qa."itemId" = cp."itemId" AND qa."finishedAt" IS NOT NULL) = 1`),
    correct_answers: () => prisma.attempt.count({ where: { userId, isCorrect: true } }),
    subjects_completed: async () => (await subjectsInfo()).full,
    subjects_completed_all: async () => (await subjectsInfo()).allDone,
    errors_cleared: () => scalar(sql`SELECT COUNT(DISTINCT a."questionId") AS n FROM "Attempt" a WHERE a."userId" = ${userId}::uuid AND a."isCorrect" AND EXISTS (SELECT 1 FROM "Attempt" b WHERE b."userId" = a."userId" AND b."questionId" = a."questionId" AND NOT b."isCorrect" AND b."answeredAt" < a."answeredAt")`),
    reviews_passed: () => prisma.attempt.count({ where: { userId, isCorrect: true, quizAttemptId: null } }),
    exam_pass: async () => (await examScores()).filter((row) => row.max > 0 && row.score * 2 >= row.max).length,
    exam_perfect: async () => (await examScores()).filter((row) => row.max > 0 && row.score >= row.max).length,
    formats_succeeded: () => scalar(sql`SELECT COUNT(DISTINCT q."type") AS n FROM "Attempt" a JOIN "Question" q ON q.id = a."questionId" WHERE a."userId" = ${userId}::uuid AND a."isCorrect" AND q."type" IN ('MCQ','GAP','DRAG','TRUE_FALSE','MATCHING','SWIPE')`),
    league_promotions: () => prisma.leagueMember.count({ where: { userId, outcome: "PROMOTED" } }),
    league_podiums: () => prisma.leagueMember.count({ where: { userId, finalRank: { gte: 1, lte: 3 } } }),
    league_firsts: () => prisma.leagueMember.count({ where: { userId, finalRank: 1 } }),
    league_tier_reached: async () => (await prisma.profile.findUnique({ where: { id: userId }, select: { leagueTier: { select: { position: true } } } }))?.leagueTier?.position ?? 0,
    events_joined: () => prisma.eventParticipation.count({ where: { userId, contribution: { gt: 0 } } }),
    solo_events_won: async () => {
      const rows = await prisma.eventParticipation.findMany({ where: { userId, event: { kind: "SOLO", goal: { not: null } } }, select: { contribution: true, event: { select: { goal: true } } } });
      return rows.filter((row) => row.event.goal !== null && row.contribution >= row.event.goal).length;
    },
    team_events_won: async () => {
      const rows = await prisma.eventParticipation.findMany({ where: { userId, contribution: { gt: 0 }, event: { kind: "TEAM", goal: { not: null } } }, select: { eventId: true, event: { select: { goal: true } } } });
      let reached = 0;
      for (const row of rows) {
        const total = await prisma.eventParticipation.aggregate({ where: { eventId: row.eventId }, _sum: { contribution: true } });
        if (row.event.goal !== null && (total._sum.contribution ?? 0) >= row.event.goal) reached++;
      }
      return reached;
    },
  };
}

/** Évalue les badges non obtenus et retourne ceux qui viennent d'être gagnés. `only` limite aux indicateurs concernés. */
export async function evaluateBadges(userId: string, only?: readonly string[]) {
  const [badges, owned] = await Promise.all([
    prisma.badge.findMany({ select: { id: true, slug: true, name: true, rule: true } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ]);
  const ownedIds = new Set(owned.map((row) => row.badgeId));
  const readers = metricReaders(userId);
  const memo = new Map<string, Promise<number>>();
  const value = (metric: string) => {
    if (!memo.has(metric)) memo.set(metric, readers[metric] ? readers[metric]() : Promise.resolve(0));
    return memo.get(metric)!;
  };
  const won: { id: string; slug: string; name: string }[] = [];
  for (const badge of badges) {
    if (ownedIds.has(badge.id)) continue;
    const rule = parseRule(badge.rule);
    if (!rule || (only && !only.includes(rule.metric))) continue;
    if ((await value(rule.metric)) >= rule.threshold) won.push({ id: badge.id, slug: badge.slug, name: badge.name });
  }
  if (won.length) {
    await prisma.userBadge.createMany({ data: won.map((badge) => ({ userId, badgeId: badge.id })), skipDuplicates: true });
  }
  return won.map(({ slug, name }) => ({ slug, name }));
}

/** Valeur actuelle d'un indicateur pour afficher la progression d'un badge (page Badges). */
export async function readBadgeMetrics(userId: string, metrics: string[]) {
  const readers = metricReaders(userId);
  const unique = [...new Set(metrics)];
  const values = await Promise.all(unique.map((metric) => (readers[metric] ? readers[metric]() : Promise.resolve(0))));
  return Object.fromEntries(unique.map((metric, index) => [metric, values[index]])) as Record<string, number>;
}
