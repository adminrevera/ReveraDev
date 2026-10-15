import { prisma } from "@/lib/prisma";

// Premier cours que tout nouvel étudiant d'un niveau lit en premier.
// Règle : « première matière » = celle choisie dans l'administration (réglage onboarding.firstSubjectId), sinon la première
// du niveau (semestre puis position). Le « premier chapitre » d'une matière est toujours son chapitre publié de plus petit numéro.
export async function getFirstChapterOfSubject(subjectId: string) {
  return prisma.contentItem.findFirst({
    where: { subjectId, kind: "CHAPTER", publishedVersionId: { not: null }, publishedVersion: { is: { status: "PUBLISHED" } } },
    orderBy: { number: "asc" },
    select: { id: true, number: true, title: true, subject: { select: { name: true } } },
  });
}

export async function getFirstCourse(levelId: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key: "onboarding.firstSubjectId" }, select: { value: true } });
  const configured = typeof setting?.value === "string" ? setting.value : null;
  if (configured) {
    const subject = await prisma.subject.findFirst({ where: { id: configured, levelId }, select: { id: true } });
    const chapter = subject ? await getFirstChapterOfSubject(subject.id) : null;
    if (chapter) return chapter;
  }
  const subjects = await prisma.subject.findMany({
    where: { levelId, visibility: { in: ["PUBLIC", "PREMIUM"] } },
    orderBy: [{ semester: { sort: "asc", nulls: "last" } }, { position: "asc" }],
    select: { id: true },
  });
  for (const subject of subjects) {
    const chapter = await getFirstChapterOfSubject(subject.id);
    if (chapter) return chapter;
  }
  return null;
}
