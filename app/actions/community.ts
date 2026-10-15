"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

// ───────────── Groupe d'entraide (offre Réussite) ─────────────

async function requireHelpAccess(groupId: string) {
  const { profile } = await requireStudentProfile();
  const limits = await prisma.tierLimits.findUnique({ where: { tier: profile.tier }, select: { helpGroup: true } });
  if (!limits?.helpGroup) return { profile, error: "Le groupe d’entraide est inclus dans l’offre Réussite." } as const;
  const group = await prisma.helpGroup.findFirst({
    where: { id: groupId, OR: [{ subjectId: null }, { subject: { levelId: profile.levelId ?? "" } }] },
    select: { id: true },
  });
  if (!group) return { profile, error: "Ce groupe n’est pas disponible." } as const;
  return { profile, error: null, groupId: group.id } as const;
}

export async function joinHelpGroup(groupIdInput: string) {
  const parsed = z.string().uuid().safeParse(groupIdInput);
  if (!parsed.success) return { error: "Groupe invalide." };
  const access = await requireHelpAccess(parsed.data);
  if (access.error !== null) return { error: access.error };
  await prisma.helpMember.createMany({ data: [{ groupId: access.groupId, userId: access.profile.id }], skipDuplicates: true });
  revalidatePath("/entraide");
  return { error: null };
}

export async function postHelpMessage(groupIdInput: string, bodyInput: string) {
  const parsed = z.object({ groupId: z.string().uuid(), body: z.string().trim().min(1).max(1000) }).safeParse({ groupId: groupIdInput, body: bodyInput });
  if (!parsed.success) return { error: "Écris un message de 1000 caractères maximum." };
  const access = await requireHelpAccess(parsed.data.groupId);
  if (access.error !== null) return { error: access.error };
  const member = await prisma.helpMember.findUnique({ where: { groupId_userId: { groupId: access.groupId, userId: access.profile.id } }, select: { userId: true } });
  if (!member) return { error: "Rejoins d’abord ce groupe." };
  const recent = await prisma.helpMessage.count({ where: { authorId: access.profile.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent >= 8) return { error: "Doucement : attends un instant avant d’écrire à nouveau." };
  await prisma.helpMessage.create({ data: { groupId: access.groupId, authorId: access.profile.id, body: parsed.data.body } });
  return { error: null };
}

export async function fetchHelpMessages(groupIdInput: string) {
  const parsed = z.string().uuid().safeParse(groupIdInput);
  if (!parsed.success) return { error: "Groupe invalide.", messages: [] };
  const access = await requireHelpAccess(parsed.data);
  if (access.error !== null) return { error: access.error, messages: [] };
  const rows = await prisma.helpMessage.findMany({
    where: { groupId: access.groupId, hiddenAt: null },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { displayName: true } } },
  });
  return {
    error: null,
    messages: rows.reverse().map((row) => ({
      id: row.id,
      body: row.body,
      at: row.createdAt.toISOString(),
      mine: row.authorId === access.profile.id,
      author: row.author?.displayName ?? "Étudiant",
    })),
  };
}

// ───────────── Aide et support ─────────────

export async function createSupportTicket(subjectInput: string, messageInput: string) {
  const { profile } = await requireStudentProfile();
  const parsed = z.object({ subject: z.string().trim().min(3).max(120), message: z.string().trim().min(10).max(3000) }).safeParse({ subject: subjectInput, message: messageInput });
  if (!parsed.success) return { error: "Indique un sujet (3 caractères minimum) et décris ton problème (10 caractères minimum)." } as const;
  const open = await prisma.supportTicket.count({ where: { userId: profile.id, status: "open" } });
  if (open >= 5) return { error: "Tu as déjà plusieurs demandes ouvertes. Attends une réponse avant d’en créer une nouvelle." } as const;
  const ticket = await prisma.supportTicket.create({ data: { userId: profile.id, subject: parsed.data.subject, message: parsed.data.message }, select: { id: true } });
  revalidatePath("/aide");
  return { error: null, ticketId: ticket.id } as const;
}

export async function replySupportTicket(ticketIdInput: string, bodyInput: string) {
  const { profile } = await requireStudentProfile();
  const parsed = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(3000) }).safeParse({ ticketId: ticketIdInput, body: bodyInput });
  if (!parsed.success) return { error: "Écris ton message." };
  const ticket = await prisma.supportTicket.findFirst({ where: { id: parsed.data.ticketId, userId: profile.id }, select: { id: true } });
  if (!ticket) return { error: "Demande introuvable." };
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: ticket.id, authorId: profile.id, fromStaff: false, body: parsed.data.body } }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "open", resolvedAt: null } }),
  ]);
  revalidatePath(`/aide/${ticket.id}`);
  return { error: null };
}
