import type { PlanTier } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const getCachedStudentCatalog = unstable_cache(
  async (levelId: string, tier: PlanTier) => {
    const visibleKinds = tier === "FREE" ? ["PUBLIC"] as const : ["PUBLIC", "PREMIUM"] as const;

    const [subjects, questions] = await Promise.all([
      prisma.subject.findMany({
        where: { levelId, visibility: { in: [...visibleKinds] } },
        orderBy: [{ semester: "asc" }, { position: "asc" }],
        select: {
          id: true,
          name: true,
          semester: true,
          position: true,
          items: {
            where: {
              kind: "CHAPTER",
              publishedVersionId: { not: null },
              visibility: { in: [...visibleKinds] },
              publishedVersion: { is: { status: "PUBLISHED" } },
            },
            orderBy: { number: "asc" },
            select: { id: true, number: true, title: true },
          },
        },
      }),
      prisma.question.findMany({
        where: {
          type: "MCQ",
          isPlaceholder: false,
          version: {
            status: "PUBLISHED",
            item: {
              kind: "CHAPTER",
              visibility: { in: [...visibleKinds] },
              subject: { levelId, visibility: { in: [...visibleKinds] } },
            },
          },
        },
        orderBy: { id: "asc" },
        take: 7,
        select: { text: true },
      }),
    ]);

    return { subjects, questions };
  },
  ["student-catalog-v1"],
  { revalidate: 60, tags: ["student-catalog"] },
);

export function getStudentCatalog(levelId: string, tier: PlanTier) {
  return getCachedStudentCatalog(levelId, tier);
}
