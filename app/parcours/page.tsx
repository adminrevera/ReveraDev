import type { Metadata } from "next";
import Link from "next/link";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";
import { getStudentCatalog } from "@/lib/student/catalog";

export const metadata: Metadata = { title: "Mon parcours · Revera" };

export default async function LearningPathPage() {
  const { profile } = await requireStudentProfile();
  const [catalog, progressRows] = profile.levelId ? await Promise.all([
    getStudentCatalog(profile.levelId, profile.tier),
    prisma.chapterProgress.findMany({
      where: { userId: profile.id },
      select: { itemId: true, readAt: true, bestQuizScore: true, completedAt: true },
    }),
  ]) : [null, []];
  const progressByItem = new Map(progressRows.map((progress) => [progress.itemId, progress]));
  const subjects = (catalog?.subjects ?? []).map((subject) => ({
    ...subject,
    items: subject.items.map((item) => ({
      ...item,
      progress: progressByItem.has(item.id) ? [progressByItem.get(item.id)!] : [],
    })),
  }));

  const semesters = new Map<number | null, typeof subjects>();
  for (const subject of subjects) {
    const semester = subject.semester;
    semesters.set(semester, [...(semesters.get(semester) ?? []), subject]);
  }

  return (
    <StudentShell role={profile.role}>
      <header className="mb-7">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Apprendre</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Mon parcours</h1>
        <p className="mt-2 text-sm text-muted">{profile.level ? `${profile.level.name} · ${profile.level.track.name}` : "Choisis un niveau dans ton profil pour découvrir tes cours."}</p>
      </header>
      {!profile.levelId ? (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="text-xl font-semibold">Quel est ton niveau d’études?</h2><p className="mt-2 text-sm text-muted">Ton parcours de chapitres dépend du niveau associé à ton compte.</p>
          <Link href="/profil" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-accent/40 px-5 text-sm font-semibold text-fg no-underline">Compléter mon profil</Link>
        </section>
      ) : semesters.size === 0 ? (
        <section className="rounded-2xl border border-line bg-panel p-6 text-sm text-muted">Aucun cours publié pour ce niveau pour le moment.</section>
      ) : (
        <div className="grid gap-6">{Array.from(semesters.entries()).map(([semester, semesterSubjects]) => (
          <section key={semester ?? "none"}>
            <h2 className="mb-3 text-xl font-semibold">{semester ? `Semestre ${semester}` : "Cours complémentaires"}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {semesterSubjects.map((subject) => {
                const completed = subject.items.filter((item) => item.progress[0]?.completedAt).length;
                return <article key={subject.id} className="rounded-2xl border border-line bg-panel p-5">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{subject.name}</h3><p className="mt-1 text-xs text-muted">{completed} / {subject.items.length} chapitres validés</p></div><span className="rounded-full bg-bg2 px-3 py-1 text-xs text-muted">{subject.items.length} cours</span></div>
                  <ol className="mt-4 grid gap-2">
                    {subject.items.map((item, index) => {
                      const state = item.progress[0];
                      const unlocked = index === 0 || !!subject.items[index - 1]?.progress[0]?.completedAt;
                      const label = state?.completedAt ? "Validé" : state?.readAt ? "Reprendre" : unlocked ? "À lire" : "Verrouillé";
                      return <li key={item.id}>
                        {unlocked ? <Link href={`/parcours/${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg2/70 px-3.5 py-3 text-sm text-fg no-underline transition hover:border-accent/40"><span><span className="mr-2 text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>{item.title}</span><span className={`shrink-0 text-xs ${state?.completedAt ? "text-accent" : "text-muted"}`}>{label}</span></Link> : <div className="flex items-center justify-between gap-3 rounded-xl border border-line/70 px-3.5 py-3 text-sm text-muted"><span>{item.title}</span><span className="text-xs">🔒 {label}</span></div>}
                      </li>;
                    })}
                    {subject.items.length === 0 && <li className="text-sm text-muted">Les chapitres de cette matière seront publiés prochainement.</li>}
                  </ol>
                </article>;
              })}
            </div>
          </section>
        ))}</div>
      )}
    </StudentShell>
  );
}
