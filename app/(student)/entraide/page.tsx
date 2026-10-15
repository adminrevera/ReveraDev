import type { Metadata } from "next";
import Link from "next/link";
import JoinGroupButton from "@/components/student/JoinGroupButton";
import { EmptyState, Eyebrow, PageHeader } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Entraide · Revera" };

export default async function HelpGroupsPage() {
  const { profile } = await requireStudentProfile();
  const limits = await prisma.tierLimits.findUnique({ where: { tier: profile.tier }, select: { helpGroup: true } });
  if (!limits?.helpGroup) {
    return (
      <>
        <PageHeader eyebrow="Communauté" title="Entraide">Échange avec les autres étudiants de ton niveau, matière par matière.</PageHeader>
        <EmptyState title="Inclus dans l’offre Réussite" href="/abonnement" action="Voir les offres">Le groupe d’entraide est réservé aux abonnés de l’offre Réussite.</EmptyState>
      </>
    );
  }
  if (!profile.levelId) {
    return (
      <>
        <PageHeader eyebrow="Communauté" title="Entraide">Échange avec les autres étudiants de ton niveau.</PageHeader>
        <EmptyState title="Renseigne ton niveau" href="/profil" action="Compléter mon profil">Les groupes sont organisés par niveau.</EmptyState>
      </>
    );
  }
  // Crée le groupe général et un groupe par matière du niveau s'ils n'existent pas encore (l'administration peut les renommer).
  const [subjects, existing] = await Promise.all([
    prisma.subject.findMany({ where: { levelId: profile.levelId }, orderBy: [{ semester: "asc" }, { position: "asc" }], select: { id: true, name: true } }),
    prisma.helpGroup.findMany({ where: { OR: [{ subjectId: null }, { subject: { levelId: profile.levelId } }] }, select: { id: true, name: true, subjectId: true } }),
  ]);
  const missing = [
    ...(existing.some((group) => group.subjectId === null) ? [] : [{ name: "Général", subjectId: null as string | null }]),
    ...subjects.filter((subject) => !existing.some((group) => group.subjectId === subject.id)).map((subject) => ({ name: subject.name, subjectId: subject.id as string | null })),
  ];
  if (missing.length) await prisma.helpGroup.createMany({ data: missing });
  const groups = await prisma.helpGroup.findMany({
    where: { OR: [{ subjectId: null }, { subject: { levelId: profile.levelId } }] },
    orderBy: [{ subjectId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    select: { id: true, name: true, _count: { select: { members: true } }, members: { where: { userId: profile.id }, select: { userId: true } } },
  });
  return (
    <>
      <PageHeader eyebrow="Communauté" title="Entraide">Pose tes questions et réponds aux autres. Reste bienveillant : les messages peuvent être modérés.</PageHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => {
          const joined = group.members.length > 0;
          return (
            <article key={group.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-5">
              <div className="min-w-0"><Eyebrow>{group._count.members} membre{group._count.members > 1 ? "s" : ""}</Eyebrow><h2 className="mt-1 truncate text-lg font-semibold">{group.name}</h2></div>
              {joined ? <Link href={`/entraide/${group.id}`} className="inline-flex min-h-10 items-center rounded-full border border-accent bg-accent px-4 text-sm font-semibold text-accent-ink no-underline">Ouvrir</Link> : <JoinGroupButton groupId={group.id} />}
            </article>
          );
        })}
      </div>
    </>
  );
}
