import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getStudentChapter(profile: Profile, itemId: string) {
  if (!profile.levelId) return null;
  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    include: {
      subject: { select: { levelId: true, visibility: true, name: true } },
      publishedVersion: true,
    },
  });
  if (
    !item ||
    item.kind !== "CHAPTER" ||
    item.subject.levelId !== profile.levelId ||
    !item.publishedVersion ||
    item.publishedVersion.status !== "PUBLISHED"
  ) return null;

  if (item.visibility !== "PUBLIC" && !(profile.tier !== "FREE" && item.visibility === "PREMIUM")) return null;
  if (item.subject.visibility !== "PUBLIC" && !(profile.tier !== "FREE" && item.subject.visibility === "PREMIUM")) return null;

  const previousChapter = await prisma.contentItem.findFirst({
    where: {
      subjectId: item.subjectId,
      kind: "CHAPTER",
      number: { lt: item.number },
      publishedVersionId: { not: null },
      ...(profile.tier === "FREE" ? { visibility: "PUBLIC", subject: { visibility: "PUBLIC" } } : {}),
    },
    orderBy: { number: "desc" },
    select: { id: true },
  });
  if (previousChapter) {
    const previousProgress = await prisma.chapterProgress.findUnique({
      where: { userId_itemId: { userId: profile.id, itemId: previousChapter.id } },
      select: { completedAt: true },
    });
    if (!previousProgress?.completedAt) return null;
  }
  return item;
}

export function bodyHtmlToText(body: string | null) {
  if (!body) return "";
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|h[1-6]|li|tr)>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
