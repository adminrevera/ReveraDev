import { QuestMetric } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { deriveQuestionBank, setQuestActive, updateNumberSetting } from "@/app/admin/studio-actions";
import { requireAdminAction } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

// Assistant d'administration. Garde-fous : aucune action « publier » ni « approuver » n'existe ici (l'IA ne publie jamais seule),
// pas de suppression, pas d'accès aux données personnelles des étudiants (seulement des totaux).

export type AssistantMode = "ask" | "manual" | "auto";

export const READ_TOOLS = [
  { name: "get_stats", description: "Totaux : étudiants, abonnés, chapitres validés, versions à relire, tickets ouverts, paiements en attente.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_pending_versions", description: "Versions de contenu à relire (brouillon, relecture, approuvée), avec matière et nombre de questions.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_subjects", description: "Matières, nombre de chapitres, chapitres publiés et premier chapitre publié de chacune (avec leurs identifiants).", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_quests", description: "Réserve de quêtes (identifiant, titre, objectif, active ou non).", input_schema: { type: "object", properties: {}, additionalProperties: false } },
] as const;

export const WRITE_TOOLS = [
  { name: "derive_question_bank", description: "Ajoute les formats de questions manquants (dérivés du texte du cours) en versions À RELIRE pour un chapitre (itemId) ou toute une matière (subjectId). Ne publie jamais.", input_schema: { type: "object", properties: { itemId: { type: "string" }, subjectId: { type: "string" } }, additionalProperties: false } },
  { name: "create_quest", description: "Ajoute une quête à la réserve (elle pourra être tirée les jours suivants).", input_schema: { type: "object", properties: { title: { type: "string" }, metric: { type: "string", enum: Object.values(QuestMetric) }, target: { type: "integer", minimum: 1 }, rewardXp: { type: "integer", minimum: 0 } }, required: ["title", "metric", "target", "rewardXp"], additionalProperties: false } },
  { name: "set_quest_active", description: "Active ou désactive une quête de la réserve.", input_schema: { type: "object", properties: { questId: { type: "string" }, active: { type: "boolean" } }, required: ["questId", "active"], additionalProperties: false } },
  { name: "set_setting", description: "Modifie un réglage numérique autorisé : quests.perDay (1 à 8) ou league.unlockAfterChapters (1 à 20).", input_schema: { type: "object", properties: { key: { type: "string", enum: ["quests.perDay", "league.unlockAfterChapters"] }, value: { type: "integer" } }, required: ["key", "value"], additionalProperties: false } },
] as const;

export const WRITE_TOOL_NAMES: readonly string[] = WRITE_TOOLS.map((tool) => tool.name);

const uuid = z.string().uuid();

export function describeAction(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "derive_question_bank": return `Compléter les formats de questions (${input.itemId ? "un chapitre" : "une matière"}) — versions à relire`;
    case "create_quest": return `Créer la quête « ${String(input.title)} » (${String(input.target)} × ${String(input.metric)}, ${String(input.rewardXp)} XP)`;
    case "set_quest_active": return `${input.active ? "Activer" : "Désactiver"} une quête`;
    case "set_setting": return `Régler ${String(input.key)} sur ${String(input.value)}`;
    default: return name;
  }
}

export async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const { user } = await requireAdminAction();
  switch (name) {
    case "get_stats": {
      const [students, subscribers, validated, pending, tickets, payments] = await Promise.all([
        prisma.profile.count({ where: { role: "STUDENT" } }),
        prisma.subscription.count(),
        prisma.chapterProgress.count({ where: { completedAt: { not: null } } }),
        prisma.contentVersion.count({ where: { status: { in: ["AI_DRAFT", "IN_REVIEW", "APPROVED"] } } }),
        prisma.supportTicket.count({ where: { status: "open" } }),
        prisma.payment.count({ where: { status: "PENDING" } }),
      ]);
      return { students, subscribers, chaptersValidated: validated, versionsToReview: pending, openTickets: tickets, pendingPayments: payments };
    }
    case "list_pending_versions": {
      const rows = await prisma.contentVersion.findMany({
        where: { status: { in: ["AI_DRAFT", "IN_REVIEW", "APPROVED"] } }, orderBy: { createdAt: "desc" }, take: 30,
        select: { id: true, version: true, status: true, origin: true, title: true, item: { select: { number: true, subject: { select: { name: true } } } }, _count: { select: { questions: true } } },
      });
      return rows.map((row) => ({ id: row.id, title: row.title, subject: row.item.subject.name, chapter: row.item.number, version: row.version, status: row.status, origin: row.origin, questions: row._count.questions }));
    }
    case "list_subjects": {
      const rows = await prisma.subject.findMany({
        orderBy: [{ semester: { sort: "asc", nulls: "last" } }, { position: "asc" }],
        select: { id: true, name: true, items: { where: { kind: "CHAPTER" }, orderBy: { number: "asc" }, select: { id: true, number: true, title: true, publishedVersionId: true } } },
      });
      return rows.map((row) => {
        const first = row.items.find((item) => item.publishedVersionId);
        return { id: row.id, name: row.name, chapters: row.items.length, published: row.items.filter((item) => item.publishedVersionId).length, firstChapter: first ? { id: first.id, number: first.number, title: first.title } : null };
      });
    }
    case "list_quests":
      return prisma.questDefinition.findMany({ orderBy: [{ metric: "asc" }, { target: "asc" }], select: { id: true, title: true, metric: true, target: true, rewardXp: true, active: true } });
    case "derive_question_bank": {
      const parsed = z.object({ itemId: uuid.optional(), subjectId: uuid.optional() }).refine((v) => v.itemId || v.subjectId).parse(input);
      return deriveQuestionBank(parsed);
    }
    case "create_quest": {
      const parsed = z.object({ title: z.string().trim().min(3).max(120), metric: z.nativeEnum(QuestMetric), target: z.number().int().min(1).max(100_000), rewardXp: z.number().int().min(0).max(100_000) }).parse(input);
      const base = parsed.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "quete";
      const quest = await prisma.questDefinition.create({ data: { ...parsed, slug: `${base}-${randomBytes(3).toString("hex")}` }, select: { id: true } });
      await prisma.auditLog.create({ data: { actorId: user.id, action: "assistant.create_quest", entity: "QuestDefinition", entityId: quest.id } });
      return { created: quest.id };
    }
    case "set_quest_active": {
      const parsed = z.object({ questId: uuid, active: z.boolean() }).parse(input);
      await setQuestActive(parsed.questId, parsed.active);
      return { ok: true };
    }
    case "set_setting": {
      const parsed = z.object({ key: z.enum(["quests.perDay", "league.unlockAfterChapters"]), value: z.number().int() }).parse(input);
      await updateNumberSetting(parsed.key, parsed.value);
      return { ok: true };
    }
    default:
      throw new Error("Outil inconnu.");
  }
}
