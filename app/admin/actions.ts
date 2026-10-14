"use server";

import {
  AnnouncementAudience,
  EventKind,
  EventStatus,
  PlanTier,
  Prisma,
  QuestMetric,
  Role,
} from "@prisma/client";
import { randomBytes } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/access";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";
import { MAX_READING_MIN_SECONDS } from "@/lib/reading-settings";
import { measureServerOperation } from "@/lib/server-performance";

const uuid = z.string().uuid();
const getText = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const audit = (actorId: string, action: string, entity: string, entityId: string, meta?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({
    data: { actorId, action, entity, entityId, ...(meta ? { meta } : {}) },
  });

export async function reviewContent(formData: FormData) {
  const { user, profile } = await requireAdminAction();
  const parsed = z.object({ versionId: uuid, action: z.enum(["approve", "publish"]) }).safeParse({
    versionId: getText(formData, "versionId"),
    action: getText(formData, "action"),
  });
  if (!parsed.success) throw new Error("Demande de modération invalide.");

  await measureServerOperation("admin.reviewContent.transaction", () => prisma.$transaction(async (tx) => {
    if (parsed.data.action === "approve") {
      const updated = await tx.contentVersion.updateMany({
        where: { id: parsed.data.versionId, status: { in: ["IN_REVIEW", "AI_DRAFT"] } },
        data: { status: "APPROVED", reviewedById: profile.id, reviewedAt: new Date() },
      });
      if (updated.count !== 1) {
        const version = await tx.contentVersion.findUnique({
          where: { id: parsed.data.versionId },
          select: { id: true },
        });
        if (!version) throw new Error("Cette version de contenu n’existe plus.");
        throw new Error("Cette version ne peut plus être approuvée dans son état actuel.");
      }
      await tx.auditLog.create({
        data: { actorId: user.id, action: "content.approve", entity: "ContentVersion", entityId: parsed.data.versionId },
      });
      return;
    }

    const version = await tx.contentVersion.findUnique({
      where: { id: parsed.data.versionId },
      select: {
        id: true,
        itemId: true,
        status: true,
        reviewedById: true,
        title: true,
        item: { select: { publishedVersionId: true } },
      },
    });
    if (!version) throw new Error("Cette version de contenu n’existe plus.");
    if (version.status !== "APPROVED" || !version.reviewedById) {
      throw new Error("Une version doit être relue et approuvée avant publication.");
    }
    if (!version.item) throw new Error("Le contenu associé à cette version est introuvable.");
    if (version.item.publishedVersionId === version.id) return;

    if (version.item.publishedVersionId) {
      await tx.contentVersion.update({
        where: { id: version.item.publishedVersionId },
        data: { status: "ARCHIVED" },
      });
    }
    await tx.contentVersion.update({
      where: { id: version.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await tx.contentItem.update({
      where: { id: version.itemId },
      data: { publishedVersionId: version.id, title: version.title },
    });
    await tx.auditLog.create({
      data: { actorId: user.id, action: "content.publish", entity: "ContentVersion", entityId: version.id },
    });
  }));

  revalidatePath("/admin");
  revalidatePath("/parcours");
  if (parsed.data.action === "publish") revalidateTag("student-catalog");
}

export async function createContentRevision(formData: FormData) {
  const { user, profile } = await requireAdminAction();
  const parsed = z.object({
    itemId: uuid,
    title: z.string().trim().min(2).max(180),
    body: z.string().max(100_000),
    note: z.string().trim().min(3).max(500),
  }).safeParse({
    itemId: getText(formData, "itemId"),
    title: getText(formData, "title"),
    body: String(formData.get("body") ?? ""),
    note: getText(formData, "note"),
  });
  if (!parsed.success) throw new Error("Les informations de la nouvelle version sont invalides.");

  await prisma.$transaction(async (tx) => {
    const item = await tx.contentItem.findUnique({
      where: { id: parsed.data.itemId },
      include: { versions: { orderBy: { version: "desc" }, take: 1, include: { questions: true, flashcards: true } } },
    });
    const previous = item?.versions[0];
    if (!item || !previous) throw new Error("Aucune version existante à corriger.");

    await tx.contentVersion.create({
      data: {
        itemId: item.id,
        version: previous.version + 1,
        status: "IN_REVIEW",
        title: parsed.data.title,
        subtitle: previous.subtitle,
        bodyHtml: parsed.data.body || null,
        data: previous.data === null ? Prisma.DbNull : previous.data as Prisma.InputJsonValue,
        origin: "manuel",
        note: parsed.data.note,
        createdById: profile.id,
        questions: {
          create: previous.questions.map((question) => ({
            key: question.key,
            position: question.position,
            type: question.type,
            text: question.text,
            data: question.data as Prisma.InputJsonValue,
            explanation: question.explanation,
            level: question.level,
            section: question.section,
            isPlaceholder: question.isPlaceholder,
          })),
        },
        flashcards: {
          create: previous.flashcards.map((card) => ({
            position: card.position,
            front: card.front,
            back: card.back,
            tag: card.tag,
          })),
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "content.revision.create",
        entity: "ContentItem",
        entityId: item.id,
        meta: { sourceVersion: previous.version, newVersion: previous.version + 1 },
      },
    });
  });

  revalidatePath("/admin");
}

export async function getContentVersionBodyHtml(versionId: string) {
  await requireAdminAction();
  const parsedVersionId = uuid.safeParse(versionId);
  if (!parsedVersionId.success) throw new Error("Identifiant de version invalide.");

  const version = await prisma.contentVersion.findUnique({
    where: { id: parsedVersionId.data },
    select: { bodyHtml: true },
  });
  if (!version) throw new Error("Version de contenu introuvable.");

  return version.bodyHtml;
}

export async function setStudentSuspended(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.object({ studentId: uuid, suspended: z.enum(["true", "false"]) }).safeParse({
    studentId: getText(formData, "studentId"),
    suspended: getText(formData, "suspended"),
  });
  if (!parsed.success) throw new Error("Demande de compte invalide.");

  const target = await prisma.profile.findUnique({ where: { id: parsed.data.studentId }, select: { role: true } });
  if (!target || target.role !== Role.STUDENT) throw new Error("Ce compte étudiant est introuvable.");
  const suspendedAt = parsed.data.suspended === "true" ? new Date() : null;
  await prisma.$transaction([
    prisma.profile.update({ where: { id: parsed.data.studentId }, data: { suspendedAt } }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: suspendedAt ? "student.suspend" : "student.unsuspend",
        entity: "Profile",
        entityId: parsed.data.studentId,
      },
    }),
  ]);
  revalidatePath("/admin");
}

export async function createEvent(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(1000),
    kind: z.nativeEnum(EventKind),
    goal: z.coerce.number().int().min(1).max(1_000_000),
    unit: z.string().trim().min(1).max(40),
    rewardXp: z.coerce.number().int().min(0).max(100_000),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  }).safeParse({
    title: getText(formData, "title"),
    description: getText(formData, "description"),
    kind: getText(formData, "kind"),
    goal: getText(formData, "goal"),
    unit: getText(formData, "unit"),
    rewardXp: getText(formData, "rewardXp"),
    startsAt: getText(formData, "startsAt"),
    endsAt: getText(formData, "endsAt"),
  });
  if (!parsed.success) throw new Error("Les informations de l’événement sont invalides.");

  const startsAt = new Date(`${parsed.data.startsAt}:00.000Z`);
  const endsAt = new Date(`${parsed.data.endsAt}:00.000Z`);
  if (
    !Number.isFinite(startsAt.getTime()) ||
    !Number.isFinite(endsAt.getTime()) ||
    startsAt.toISOString().slice(0, 16) !== parsed.data.startsAt ||
    endsAt.toISOString().slice(0, 16) !== parsed.data.endsAt ||
    startsAt >= endsAt
  ) {
    throw new Error("La fin de l’événement doit être postérieure à son début.");
  }
  const now = new Date();
  const status: EventStatus = endsAt <= now ? "ENDED" : startsAt > now ? "SOON" : "ACTIVE";
  const baseSlug = parsed.data.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "evenement";
  const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;
  const event = await prisma.event.create({
    data: {
      title: parsed.data.title,
      kind: parsed.data.kind,
      goal: parsed.data.goal,
      rewardXp: parsed.data.rewardXp,
      description: parsed.data.description || null,
      slug,
      unit: parsed.data.unit,
      startsAt,
      endsAt,
      status,
    },
  });
  await audit(user.id, "event.create", "Event", event.id, { status: event.status });
  revalidatePath("/admin");
}

export async function createQuest(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.object({
    title: z.string().trim().min(3).max(120),
    metric: z.nativeEnum(QuestMetric),
    target: z.coerce.number().int().min(1).max(100_000),
    rewardXp: z.coerce.number().int().min(0).max(100_000),
  }).safeParse({
    title: getText(formData, "title"),
    metric: getText(formData, "metric"),
    target: getText(formData, "target"),
    rewardXp: getText(formData, "rewardXp"),
  });
  if (!parsed.success) throw new Error("Les informations de la quête sont invalides.");
  const baseSlug = parsed.data.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "quete";
  const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;
  const day = localCalendarDay(new Date(), "Africa/Lome");
  await prisma.$transaction(async (tx) => {
    const quest = await tx.questDefinition.create({ data: { ...parsed.data, slug } });
    await tx.dailyQuest.create({ data: { day, questId: quest.id } });
    await tx.auditLog.create({
      data: { actorId: user.id, action: "quest.create-and-schedule", entity: "QuestDefinition", entityId: quest.id, meta: { day: day.toISOString().slice(0, 10) } },
    });
  });
  revalidatePath("/admin");
  revalidatePath("/quetes");
}

export async function publishAnnouncement(formData: FormData) {
  const { user } = await requireAdminAction();
  const rawLevelId = getText(formData, "levelId");
  const parsed = z.object({
    title: z.string().trim().min(3).max(140),
    body: z.string().trim().min(3).max(3000),
    audience: z.nativeEnum(AnnouncementAudience),
  }).safeParse({
    title: getText(formData, "title"),
    body: getText(formData, "body"),
    audience: getText(formData, "audience"),
  });
  if (!parsed.success || (parsed.data.audience === "LEVEL" && !uuid.safeParse(rawLevelId).success)) {
    throw new Error("Les informations de l’annonce sont invalides.");
  }
  const levelId = parsed.data.audience === "LEVEL" ? rawLevelId : null;

  await prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: { ...parsed.data, levelId, createdById: user.id },
    });
    const where: Prisma.ProfileWhereInput = {
      role: Role.STUDENT,
      suspendedAt: null,
      ...(parsed.data.audience === "SUBSCRIBERS"
        ? { tier: { not: PlanTier.FREE }, premiumUntil: { gt: new Date() } }
        : {}),
      ...(parsed.data.audience === "FREE" ? { tier: PlanTier.FREE } : {}),
      ...(levelId ? { levelId } : {}),
    };
    const recipients = await tx.profile.findMany({ where, select: { id: true } });
    if (recipients.length) {
      await tx.notification.createMany({
        data: recipients.map(({ id }) => ({
          userId: id,
          announcementId: announcement.id,
          title: announcement.title,
          body: announcement.body,
        })),
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "announcement.publish",
        entity: "Announcement",
        entityId: announcement.id,
        meta: { audience: announcement.audience, recipientCount: recipients.length },
      },
    });
  });
  revalidatePath("/admin");
}

export async function updatePlanPrice(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.object({ planId: uuid, priceXof: z.coerce.number().int().min(0).max(100_000_000) }).safeParse({
    planId: getText(formData, "planId"),
    priceXof: getText(formData, "priceXof"),
  });
  if (!parsed.success) throw new Error("Le tarif indiqué est invalide.");
  const plan = await prisma.plan.update({
    where: { id: parsed.data.planId },
    data: { priceXof: parsed.data.priceXof },
    select: { id: true, slug: true, priceXof: true },
  });
  await audit(user.id, "plan.price.update", "Plan", plan.id, { priceXof: plan.priceXof });
  revalidatePath("/admin");
}

export async function updateAiBudget(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.coerce.number().finite().min(0).max(1_000_000).safeParse(getText(formData, "monthlyBudgetUsd"));
  if (!parsed.success) throw new Error("Le budget IA mensuel doit être un montant positif valide.");
  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: "ai.monthlyBudgetUsd" },
      create: { key: "ai.monthlyBudgetUsd", value: parsed.data },
      update: { value: parsed.data },
    }),
    prisma.auditLog.create({
      data: { actorId: user.id, action: "settings.ai-budget.update", entity: "AppSetting", entityId: "ai.monthlyBudgetUsd", meta: { monthlyBudgetUsd: parsed.data } },
    }),
  ]);
  revalidatePath("/admin");
}

export async function updateReadingMinimum(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.coerce.number().int().min(0).max(MAX_READING_MIN_SECONDS).safeParse(
    getText(formData, "readingMinSeconds"),
  );
  if (!parsed.success) throw new Error(`La durée minimale doit être comprise entre 0 et ${MAX_READING_MIN_SECONDS} secondes.`);

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: "reading.minSeconds" },
      create: { key: "reading.minSeconds", value: parsed.data },
      update: { value: parsed.data },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "settings.reading-minimum.update",
        entity: "AppSetting",
        entityId: "reading.minSeconds",
        meta: { readingMinSeconds: parsed.data },
      },
    }),
  ]);
  revalidateTag("app-settings");
  revalidatePath("/admin");
}

export async function updateQuizValidationPercent(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.coerce.number().int().min(1).max(100).safeParse(
    getText(formData, "quizValidationPercent"),
  );
  if (!parsed.success) throw new Error("Le seuil de validation du quiz doit être un entier compris entre 1 et 100 %.");

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: "quiz.validationPercent" },
      create: { key: "quiz.validationPercent", value: parsed.data },
      update: { value: parsed.data },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "settings.quiz-validation.update",
        entity: "AppSetting",
        entityId: "quiz.validationPercent",
        meta: { quizValidationPercent: parsed.data },
      },
    }),
  ]);
  revalidateTag("app-settings");
  revalidatePath("/admin");
}

export async function updateTierLimits(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.object({
    tier: z.nativeEnum(PlanTier),
    dailyTrainingSessions: z.string(),
    dailyGames: z.string(),
    examsPerSubject: z.string(),
    streakFreezesPerMonth: z.coerce.number().int().min(0).max(365),
    spacedReview: z.enum(["true", "false"]),
    detailedExamCorrection: z.enum(["true", "false"]),
    helpGroup: z.enum(["true", "false"]),
  }).safeParse({
    tier: getText(formData, "tier"),
    dailyTrainingSessions: getText(formData, "dailyTrainingSessions"),
    dailyGames: getText(formData, "dailyGames"),
    examsPerSubject: getText(formData, "examsPerSubject"),
    streakFreezesPerMonth: getText(formData, "streakFreezesPerMonth"),
    spacedReview: getText(formData, "spacedReview"),
    detailedExamCorrection: getText(formData, "detailedExamCorrection"),
    helpGroup: getText(formData, "helpGroup"),
  });
  if (!parsed.success) throw new Error("Les limites de l’offre sont invalides.");

  const parseLimit = (value: string) => {
    if (value === "") return null;
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 0 || limit > 1_000_000) {
      throw new Error("Chaque limite doit être un entier positif ou vide pour illimité.");
    }
    return limit;
  };
  const limits = {
    dailyTrainingSessions: parseLimit(parsed.data.dailyTrainingSessions),
    dailyGames: parseLimit(parsed.data.dailyGames),
    examsPerSubject: parseLimit(parsed.data.examsPerSubject),
    streakFreezesPerMonth: parsed.data.streakFreezesPerMonth,
    spacedReview: parsed.data.spacedReview === "true",
    detailedExamCorrection: parsed.data.detailedExamCorrection === "true",
    helpGroup: parsed.data.helpGroup === "true",
  };
  await prisma.$transaction([
    prisma.tierLimits.upsert({
      where: { tier: parsed.data.tier },
      create: { tier: parsed.data.tier, ...limits },
      update: limits,
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "settings.tier-limits.update",
        entity: "TierLimits",
        entityId: parsed.data.tier,
        meta: limits,
      },
    }),
  ]);
  revalidatePath("/admin");
}

export async function generateAccessKey(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.object({
    planId: uuid,
    batch: z.string().trim().max(80),
  }).safeParse({ planId: getText(formData, "planId"), batch: getText(formData, "batch") });
  if (!parsed.success) throw new Error("Les informations de la clé sont invalides.");

  const code = randomBytes(8).toString("hex").toUpperCase();
  const key = await prisma.$transaction(async (tx) => {
    const created = await tx.accessKey.create({
      data: { code, planId: parsed.data.planId, batch: parsed.data.batch || null, createdById: user.id },
      select: { id: true, code: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "access-key.create",
        entity: "AccessKey",
        entityId: created.id,
        meta: { batch: parsed.data.batch || null },
      },
    });
    return created;
  });
  revalidatePath("/admin");
  return { code: key.code };
}

export async function replyToSupportTicket(formData: FormData) {
  const { user } = await requireAdminAction();
  const parsed = z.object({ ticketId: uuid, body: z.string().trim().min(2).max(4000) }).safeParse({
    ticketId: getText(formData, "ticketId"),
    body: getText(formData, "body"),
  });
  if (!parsed.success) throw new Error("Le message de réponse est invalide.");
  await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({ where: { id: parsed.data.ticketId }, select: { id: true } });
    if (!ticket) throw new Error("Ce ticket de support n’existe plus.");
    await tx.supportMessage.create({
      data: { ticketId: ticket.id, authorId: user.id, fromStaff: true, body: parsed.data.body },
    });
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "resolved", resolvedAt: new Date() },
    });
    await tx.auditLog.create({
      data: { actorId: user.id, action: "support-ticket.resolve", entity: "SupportTicket", entityId: ticket.id },
    });
  });
  revalidatePath("/admin");
}
