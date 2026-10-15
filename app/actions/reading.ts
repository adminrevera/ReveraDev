"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { splitCourseParts } from "@/lib/course-format";
import { getStudentChapter } from "@/lib/student/content";
import { prisma } from "@/lib/prisma";

// Lecture guidée : à la première lecture (et tant que le chapitre n'est pas validé), le cours s'affiche partie par partie.
// Chaque « Continuer » est enregistré côté serveur : c'est la trace que l'étudiant a lu, sans attente de 60 s.
const MIN_SECONDS_PER_PART = 2;

export async function advanceChapterPart(itemIdInput: string, partIndexInput: number) {
  const { profile } = await requireStudentProfile();
  const parsed = z.object({ itemId: z.string().uuid(), partIndex: z.number().int().min(0).max(200) })
    .safeParse({ itemId: itemIdInput, partIndex: partIndexInput });
  if (!parsed.success) return { error: "Cette partie n’est pas disponible." } as const;
  const item = await getStudentChapter(profile, parsed.data.itemId);
  if (!item?.publishedVersion) return { error: "Ce chapitre n’est pas encore accessible." } as const;

  const total = splitCourseParts(item.publishedVersion.bodyHtml ?? "").length;
  const now = new Date();
  const existing = item.progress[0] ?? null;
  const already = existing?.partsRead ?? 0;
  const { partIndex } = parsed.data;
  if (partIndex >= total) return { error: "Cette partie n’existe pas." } as const;
  if (partIndex < already || existing?.readAt) {
    return { error: null, partsRead: Math.max(already, partIndex + 1), finished: Boolean(existing?.readAt) || partIndex + 1 >= total } as const;
  }
  if (partIndex > already) return { error: "Lis d’abord les parties précédentes." } as const;

  const row = await prisma.chapterProgress.findUnique({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    select: { lastVisitedAt: true },
  });
  if (row && already > 0 && (now.getTime() - row.lastVisitedAt.getTime()) / 1000 < MIN_SECONDS_PER_PART) {
    return { error: "Prends un instant pour lire cette partie." } as const;
  }

  const finished = partIndex + 1 >= total;
  await prisma.chapterProgress.upsert({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    create: { userId: profile.id, itemId: item.id, partsRead: partIndex + 1, lastVisitedAt: now, readAt: finished ? now : null },
    update: { partsRead: partIndex + 1, lastVisitedAt: now, ...(finished ? { readAt: now } : {}) },
  });
  if (finished) revalidatePath("/parcours");
  return { error: null, partsRead: partIndex + 1, finished } as const;
}

/** Marque l'ouverture d'un chapitre (reprise là où on s'est arrêté). */
export async function touchChapter(itemIdInput: string) {
  const { profile } = await requireStudentProfile();
  const parsed = z.string().uuid().safeParse(itemIdInput);
  if (!parsed.success) return;
  const item = await getStudentChapter(profile, parsed.data);
  if (!item) return;
  await prisma.chapterProgress.upsert({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    create: { userId: profile.id, itemId: item.id },
    update: { lastVisitedAt: new Date() },
  });
}
