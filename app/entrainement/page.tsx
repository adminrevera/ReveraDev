import type { Metadata } from "next";
import Link from "next/link";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Entraînement · Revera" };

export default async function TrainingPage() {
  const { profile } = await requireStudentProfile();
  const subjects = profile.levelId ? await prisma.subject.findMany({
    where: {
      levelId: profile.levelId,
      visibility: profile.tier === "FREE" ? "PUBLIC" : { in: ["PUBLIC", "PREMIUM"] },
    },
    orderBy: [{ semester: "asc" }, { position: "asc" }],
    include: {
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
          title: true,
          progress: { where: { userId: profile.id }, take: 1, select: { readAt: true, completedAt: true } },
        },
      },
    },
  }) : [];

  return (
    <StudentShell role={profile.role}>
      <header className="mb-7">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Pratique</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Entraînement</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Les QCM de chapitre sont corrigés côté serveur. Lis d’abord le cours : le quiz se débloque ensuite et le chapitre est validé à 100 %.</p>
      </header>
      {!profile.levelId ? <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-muted">Renseigne ton niveau depuis la page Profil pour trouver des exercices adaptés.</p> : subjects.length === 0 ? <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-muted">Aucun cours n’est encore publié pour ton niveau.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((subject) => <article key={subject.id} className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="text-lg font-semibold">{subject.name}</h2>
            <ul className="mt-3 grid gap-2">
              {subject.items.map((item, index) => {
                const progress = item.progress[0];
                const unlocked = index === 0 || !!subject.items[index - 1]?.progress[0]?.completedAt;
                const href = progress?.readAt ? `/quiz/${item.id}` : `/parcours/${item.id}`;
                return <li key={item.id}>
                  {unlocked ? <Link href={href} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg2 px-3.5 py-3 text-sm text-fg no-underline hover:border-accent/40"><span>{item.title}</span><span className="shrink-0 text-xs text-muted">{progress?.readAt ? (progress.completedAt ? "Quiz validé · refaire" : "Faire le quiz") : "Lire le cours →"}</span></Link> : <div className="rounded-xl border border-line/70 px-3.5 py-3 text-sm text-muted">{item.title}<span className="float-right text-xs">Verrouillé</span></div>}
                </li>;
              })}
              {subject.items.length === 0 && <li className="text-sm text-muted">Les quiz apparaîtront à la publication des chapitres.</li>}
            </ul>
          </article>)}
        </div>
      )}
    </StudentShell>
  );
}
