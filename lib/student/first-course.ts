import { prisma } from "@/lib/prisma";

// Le chapitre choisi par l'admin passe avant le premier chapitre publié du niveau.
export async function getFirstCourse(levelId: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key: "onboarding.firstSubjectId" }, select: { value: true } });
  const configured = typeof setting?.value === "string" ? setting.value : null;
  if (configured) {
    const chapter = await prisma.contentItem.findFirst({
      where: {
        subjectId: configured,
        subject: { levelId },
        kind: "CHAPTER",
        publishedVersionId: { not: null },
        publishedVersion: { is: { status: "PUBLISHED" } },
      },
      orderBy: { number: "asc" },
      select: { id: true, number: true, title: true, subject: { select: { name: true } } },
    });
    if (chapter) return chapter;
  }

  return prisma.contentItem.findFirst({
    where: {
      kind: "CHAPTER",
      publishedVersionId: { not: null },
      publishedVersion: { is: { status: "PUBLISHED" } },
      subject: { levelId, visibility: { in: ["PUBLIC", "PREMIUM"] } },
    },
    orderBy: [
      { subject: { semester: { sort: "asc", nulls: "last" } } },
      { subject: { position: "asc" } },
      { number: "asc" },
    ],
    select: { id: true, number: true, title: true, subject: { select: { name: true } } },
  });
}
