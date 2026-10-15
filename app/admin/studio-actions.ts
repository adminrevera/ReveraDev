"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/access";
import { splitCourseParts } from "@/lib/course-format";
import { sanitizeCourseHtml } from "@/lib/course-sanitize";
import { installGamificationCatalog } from "@/lib/gamification/engine";
import { rolloverLeagueWeek } from "@/lib/gamification/league";
import { prisma } from "@/lib/prisma";
import { deriveMissingQuestions } from "@/lib/question-bank";
import { isValidQuestion } from "@/lib/questions";

const uuid = z.string().uuid();
const getText = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const log = (actorId: string, action: string, entity: string, entityId: string, meta?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({ data: { actorId, action, entity, entityId, ...(meta ? { meta } : {}) } });

function refresh() {
  revalidatePath("/admin");
  revalidateTag("app-settings");
}

// ───────────── Aperçu (rendu étudiant) ─────────────

/** Rendu côté serveur du cours tel que l'étudiant le voit : HTML nettoyé + découpage en parties. */
export async function previewCourse(html: string) {
  await requireAdminAction();
  const safe = String(html ?? "").slice(0, 200_000);
  return { parts: splitCourseParts(safe).map((part) => ({ title: part.title, html: sanitizeCourseHtml(part.html) })) };
}

// ───────────── Versions de chapitre ─────────────

const extraQuestion = z.object({
  key: z.string().trim().min(1).max(60),
  type: z.enum(["MCQ", "TRUE_FALSE", "GAP", "MATCHING", "DRAG", "SWIPE"]),
  text: z.string().trim().min(3).max(1000),
  data: z.record(z.string(), z.unknown()),
  explanation: z.string().max(1000).nullish(),
});

/** Nouvelle version (en relecture) d'un chapitre : texte modifié + questions supplémentaires facultatives (JSON). */
export async function saveChapterVersion(input: {
  itemId: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
  note: string;
  extraQuestionsJson?: string;
}) {
  const { user, profile } = await requireAdminAction();
  const parsed = z.object({
    itemId: uuid,
    title: z.string().trim().min(2).max(180),
    subtitle: z.string().trim().max(240).optional(),
    bodyHtml: z.string().max(200_000),
    note: z.string().trim().min(3).max(500),
  }).safeParse(input);
  if (!parsed.success) throw new Error("Les informations de la version sont invalides.");

  let extras: z.infer<typeof extraQuestion>[] = [];
  if (input.extraQuestionsJson?.trim()) {
    let raw: unknown;
    try { raw = JSON.parse(input.extraQuestionsJson); } catch { throw new Error("Le JSON des questions n’est pas valide."); }
    const checked = z.array(extraQuestion).max(60).safeParse(raw);
    if (!checked.success) throw new Error("Le JSON des questions ne respecte pas la forme attendue (key, type, text, data).");
    extras = checked.data;
    const bad = extras.find((question) => !isValidQuestion({ type: question.type, data: question.data as Prisma.JsonValue }));
    if (bad) throw new Error(`La question « ${bad.key} » est incomplète pour le format ${bad.type}.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.contentItem.findUnique({
      where: { id: parsed.data.itemId },
      include: { versions: { orderBy: { version: "desc" }, take: 1, include: { questions: true, flashcards: true } } },
    });
    const previous = item?.versions[0];
    if (!item || !previous) throw new Error("Aucune version existante à corriger.");
    const keys = new Set(previous.questions.map((question) => question.key));
    const fresh = extras.filter((question) => !keys.has(question.key));
    const base = previous.questions.length;
    const version = await tx.contentVersion.create({
      data: {
        itemId: item.id,
        version: previous.version + 1,
        status: "IN_REVIEW",
        title: parsed.data.title,
        subtitle: parsed.data.subtitle || previous.subtitle,
        bodyHtml: parsed.data.bodyHtml || null,
        data: previous.data === null ? Prisma.DbNull : (previous.data as Prisma.InputJsonValue),
        origin: "studio",
        note: parsed.data.note,
        createdById: profile.id,
        questions: {
          create: [
            ...previous.questions.map((question) => ({
              key: question.key, position: question.position, type: question.type, text: question.text,
              data: question.data as Prisma.InputJsonValue, explanation: question.explanation, level: question.level,
              section: question.section, isPlaceholder: question.isPlaceholder,
            })),
            ...fresh.map((question, index) => ({
              key: question.key, position: base + index, type: question.type, text: question.text,
              data: question.data as Prisma.InputJsonValue, explanation: question.explanation ?? null,
            })),
          ],
        },
        flashcards: { create: previous.flashcards.map((card) => ({ position: card.position, front: card.front, back: card.back, tag: card.tag })) },
      },
      select: { id: true, version: true },
    });
    await tx.auditLog.create({
      data: { actorId: user.id, action: "content.studio-save", entity: "ContentVersion", entityId: version.id, meta: { itemId: item.id, version: version.version, addedQuestions: fresh.length } },
    });
    return version;
  });
  refresh();
  return { versionId: created.id, version: created.version };
}

// ───────────── Banque de questions (6 formats) ─────────────

/** Complète les formats manquants d'un chapitre (ou de tous les chapitres d'une matière) : crée des versions IN_REVIEW, jamais de publication. */
export async function deriveQuestionBank(input: { itemId?: string; subjectId?: string }) {
  const { user, profile } = await requireAdminAction();
  const parsed = z.object({ itemId: uuid.optional(), subjectId: uuid.optional() }).refine((value) => value.itemId || value.subjectId).safeParse(input);
  if (!parsed.success) throw new Error("Indique un chapitre ou une matière.");

  const items = await prisma.contentItem.findMany({
    where: {
      kind: "CHAPTER",
      ...(parsed.data.itemId ? { id: parsed.data.itemId } : { subjectId: parsed.data.subjectId }),
    },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });

  let versionsCreated = 0;
  let questionsCreated = 0;
  const skipped: string[] = [];
  for (const item of items) {
    const result = await prisma.$transaction(async (tx) => {
      const latest = await tx.contentVersion.findFirst({
        where: { itemId: item.id },
        orderBy: { version: "desc" },
        include: { questions: true, flashcards: true },
      });
      if (!latest || !latest.bodyHtml) return { skipped: `Chapitre ${item.number} : pas de texte.` };
      if (latest.status === "IN_REVIEW" && latest.origin === "derive") return { skipped: `Chapitre ${item.number} : déjà en relecture.` };
      const derived = deriveMissingQuestions(latest.bodyHtml, latest.questions.map((question) => question.type), `d-${latest.id.slice(0, 4)}`);
      if (!derived.length) return { skipped: `Chapitre ${item.number} : aucun format à ajouter.` };
      const keys = new Set(latest.questions.map((question) => question.key));
      const fresh = derived.filter((question) => !keys.has(question.key));
      if (!fresh.length) return { skipped: `Chapitre ${item.number} : déjà dérivé.` };
      await tx.contentVersion.create({
        data: {
          itemId: item.id,
          version: latest.version + 1,
          status: "IN_REVIEW",
          title: latest.title,
          subtitle: latest.subtitle,
          bodyHtml: latest.bodyHtml,
          data: latest.data === null ? Prisma.DbNull : (latest.data as Prisma.InputJsonValue),
          origin: "derive",
          note: `Formats ajoutés automatiquement à partir du cours (${fresh.map((question) => question.type).join(", ")}). À relire.`,
          createdById: profile.id,
          questions: {
            create: [
              ...latest.questions.map((question) => ({
                key: question.key, position: question.position, type: question.type, text: question.text,
                data: question.data as Prisma.InputJsonValue, explanation: question.explanation, level: question.level,
                section: question.section, isPlaceholder: question.isPlaceholder,
              })),
              ...fresh.map((question, index) => ({
                key: question.key, position: latest.questions.length + index, type: question.type, text: question.text,
                data: question.data as Prisma.InputJsonValue, explanation: question.explanation,
              })),
            ],
          },
          flashcards: { create: latest.flashcards.map((card) => ({ position: card.position, front: card.front, back: card.back, tag: card.tag })) },
        },
      });
      return { added: fresh.length };
    });
    if ("added" in result && result.added) { versionsCreated++; questionsCreated += result.added; }
    else if ("skipped" in result && result.skipped) skipped.push(result.skipped);
  }
  await log(user.id, "content.derive-bank", "ContentItem", parsed.data.itemId ?? parsed.data.subjectId ?? "-", { versionsCreated, questionsCreated });
  refresh();
  return { versionsCreated, questionsCreated, skipped };
}

/** Renvoie une version en relecture vers le brouillon (avec la raison dans la note). */
export async function sendBackToDraft(versionId: string, reason: string) {
  const { user } = await requireAdminAction();
  const parsed = z.object({ versionId: uuid, reason: z.string().trim().min(3).max(500) }).safeParse({ versionId, reason });
  if (!parsed.success) throw new Error("Indique la raison du renvoi.");
  const updated = await prisma.contentVersion.updateMany({
    where: { id: parsed.data.versionId, status: { in: ["IN_REVIEW", "APPROVED"] } },
    data: { status: "AI_DRAFT", note: parsed.data.reason },
  });
  if (updated.count !== 1) throw new Error("Cette version ne peut plus être renvoyée.");
  await log(user.id, "content.send-back", "ContentVersion", parsed.data.versionId, { reason: parsed.data.reason });
  refresh();
}

// ───────────── Premier chapitre et première matière ─────────────

export async function setFirstSubject(formData: FormData) {
  const { user } = await requireAdminAction();
  const subjectId = getText(formData, "subjectId");
  if (subjectId) {
    if (!uuid.safeParse(subjectId).success) throw new Error("Matière invalide.");
    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
    if (!subject) throw new Error("Cette matière n’existe pas.");
    await prisma.appSetting.upsert({ where: { key: "onboarding.firstSubjectId" }, create: { key: "onboarding.firstSubjectId", value: subjectId }, update: { value: subjectId } });
  } else {
    await prisma.appSetting.deleteMany({ where: { key: "onboarding.firstSubjectId" } });
  }
  await log(user.id, "settings.first-subject", "AppSetting", "onboarding.firstSubjectId", { subjectId: subjectId || null });
  refresh();
  revalidatePath("/dashboard");
}

// ───────────── Gamification ─────────────

export async function installCatalog() {
  const { user } = await requireAdminAction();
  const result = await installGamificationCatalog();
  await log(user.id, "gamification.install-catalog", "Badge", "catalog", result);
  refresh();
  return result;
}

export async function setQuestActive(questId: string, active: boolean) {
  const { user } = await requireAdminAction();
  const id = uuid.parse(questId);
  await prisma.questDefinition.update({ where: { id }, data: { active: Boolean(active) } });
  await log(user.id, "quest.set-active", "QuestDefinition", id, { active: Boolean(active) });
  refresh();
}

export async function updateBadgeDetails(badgeId: string, input: { name: string; description: string }) {
  const { user } = await requireAdminAction();
  const parsed = z.object({ id: uuid, name: z.string().trim().min(2).max(80), description: z.string().trim().max(240) }).safeParse({ id: badgeId, ...input });
  if (!parsed.success) throw new Error("Badge invalide.");
  await prisma.badge.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, description: parsed.data.description || null } });
  await log(user.id, "badge.update", "Badge", parsed.data.id);
  refresh();
  revalidatePath("/badges");
}

const NUMBER_SETTINGS = {
  "quests.perDay": { min: 1, max: 8 },
  "league.unlockAfterChapters": { min: 1, max: 20 },
} as const;

export async function updateNumberSetting(key: keyof typeof NUMBER_SETTINGS, value: number) {
  const { user } = await requireAdminAction();
  const bounds = NUMBER_SETTINGS[key];
  if (!bounds) throw new Error("Réglage inconnu.");
  const parsed = z.number().int().min(bounds.min).max(bounds.max).safeParse(value);
  if (!parsed.success) throw new Error(`Valeur entre ${bounds.min} et ${bounds.max}.`);
  await prisma.appSetting.upsert({ where: { key }, create: { key, value: parsed.data }, update: { value: parsed.data } });
  await log(user.id, "settings.number", "AppSetting", key, { value: parsed.data });
  refresh();
}

export async function runLeagueRollover() {
  const { user } = await requireAdminAction();
  const result = await rolloverLeagueWeek();
  await log(user.id, "league.rollover", "LeagueWeek", "manual", { result: JSON.parse(JSON.stringify(result ?? null)) });
  refresh();
  revalidatePath("/ligue");
}

// ───────────── Lecture pour l'aperçu et l'éditeur ─────────────

export type PreviewQuestion = { key: string; type: string; text: string; answerKey: string[]; valid: boolean };

function answerKeyOf(type: string, data: unknown): string[] {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const arr = (value: unknown) => (Array.isArray(value) ? value : []);
  switch (type) {
    case "MCQ":
    case "TRUE_FALSE":
      return arr(d.options).flatMap((o) => (o && typeof o === "object" && (o as { correct?: unknown }).correct === true ? [String((o as { text?: unknown }).text)] : []));
    case "GAP": return arr(d.answers).map(String);
    case "MATCHING": return arr(d.pairs).map((p) => `${(p as { term?: unknown }).term} → ${(p as { example?: unknown }).example}`);
    case "DRAG": {
      const bank = arr(d.bank);
      return arr(d.slots).map((slot, i) => `${String(slot)} ← ${String(bank[arr(d.answer)[i] as number] ?? "?")}`);
    }
    case "SWIPE": return arr(d.cards).map((c) => `${(c as { text?: unknown }).text} → ${(c as { answer?: unknown }).answer ? "Vrai" : "Faux"}`);
    default: return [];
  }
}

/** Tout ce qu'il faut pour afficher une version comme l'étudiant la verra (parties du cours + questions avec corrigé). */
export async function getVersionPreview(versionId: string) {
  await requireAdminAction();
  const id = uuid.parse(versionId);
  const version = await prisma.contentVersion.findUnique({
    where: { id },
    select: {
      title: true, subtitle: true, bodyHtml: true, status: true, origin: true,
      questions: { orderBy: { position: "asc" }, select: { key: true, type: true, text: true, data: true } },
    },
  });
  if (!version) throw new Error("Version introuvable.");
  const parts = version.bodyHtml ? splitCourseParts(version.bodyHtml).map((part) => ({ title: part.title, html: sanitizeCourseHtml(part.html) })) : [];
  const questions: PreviewQuestion[] = version.questions.map((question) => ({
    key: question.key,
    type: question.type,
    text: question.text,
    answerKey: answerKeyOf(question.type, question.data),
    valid: isValidQuestion({ type: question.type, data: question.data }),
  }));
  return { title: version.title, subtitle: version.subtitle, status: version.status, origin: version.origin, parts, questions };
}

/** Texte et questions de la dernière version d'un chapitre, pour l'éditeur du studio. */
export async function getChapterForEditor(itemId: string) {
  await requireAdminAction();
  const id = uuid.parse(itemId);
  const item = await prisma.contentItem.findUnique({
    where: { id },
    select: {
      id: true, number: true, title: true,
      subject: { select: { name: true } },
      versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, status: true, title: true, subtitle: true, bodyHtml: true, questions: { select: { type: true } } } },
    },
  });
  const latest = item?.versions[0];
  if (!item || !latest) throw new Error("Chapitre introuvable.");
  return {
    itemId: item.id,
    number: item.number,
    subject: item.subject.name,
    version: latest.version,
    status: latest.status,
    title: latest.title,
    subtitle: latest.subtitle ?? "",
    bodyHtml: latest.bodyHtml ?? "",
    formats: Array.from(new Set(latest.questions.map((question) => question.type))),
  };
}
