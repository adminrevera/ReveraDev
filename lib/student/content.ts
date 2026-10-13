import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getStudentChapter(profile: Profile, itemId: string) {
  if (!profile.levelId) return null;
  const item = await prisma.contentItem.findFirst({
    where: {
      id: itemId,
      kind: "CHAPTER",
      publishedVersionId: { not: null },
      visibility: profile.tier === "FREE" ? "PUBLIC" : { in: ["PUBLIC", "PREMIUM"] },
      subject: {
        levelId: profile.levelId,
        visibility: profile.tier === "FREE" ? "PUBLIC" : { in: ["PUBLIC", "PREMIUM"] },
      },
      publishedVersion: { is: { status: "PUBLISHED" } },
    },
    include: {
      subject: {
        select: {
          name: true,
          items: {
            where: {
              kind: "CHAPTER",
              publishedVersionId: { not: null },
              visibility: profile.tier === "FREE" ? "PUBLIC" : { in: ["PUBLIC", "PREMIUM"] },
              publishedVersion: { is: { status: "PUBLISHED" } },
            },
            orderBy: { number: "asc" },
            select: {
              id: true,
              number: true,
              progress: {
                where: { userId: profile.id },
                take: 1,
                select: { completedAt: true },
              },
            },
          },
        },
      },
      publishedVersion: { select: { title: true, subtitle: true, bodyHtml: true, status: true } },
      progress: {
        where: { userId: profile.id },
        take: 1,
        select: { readAt: true, completedAt: true, bestQuizScore: true },
      },
    },
  });
  if (!item?.publishedVersion) return null;

  const previousChapter = item.subject.items.findLast((chapter) => chapter.number < item.number);
  if (previousChapter && !previousChapter.progress[0]?.completedAt) return null;

  return item;
}
