import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Eyebrow, PageHeader, ProgressBar, primaryButton } from "@/components/student/ui";
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
  const subjects = (catalog?.subjects ?? []).map((subject) => {
    const items = subject.items.map((item, index, all) => {
      const state = progressByItem.get(item.id) ?? null;
      const previous = index === 0 ? null : progressByItem.get(all[index - 1].id) ?? null;
      const unlocked = index === 0 || !!previous?.completedAt;
      return { ...item, state, unlocked };
    });
    const completed = items.filter((item) => item.state?.completedAt).length;
    const next = items.find((item) => !item.state?.completedAt && item.unlocked) ?? null;
    return { ...subject, items, completed, next };
  });

  // Chapitre à reprendre : le premier chapitre déverrouillé et non validé, matière par matière.
  const resume = subjects.find((subject) => subject.next)?.next ?? null;
  const resumeSubject = subjects.find((subject) => subject.next)?.name ?? "";

  const semesters = new Map<number | null, typeof subjects>();
  for (const subject of subjects) {
    semesters.set(subject.semester, [...(semesters.get(subject.semester) ?? []), subject]);
  }
  const semesterKeys = Array.from(semesters.keys());

  return (
    <>
      <PageHeader eyebrow="Apprendre" title="Mon parcours">
        {profile.level ? `${profile.level.name} · ${profile.level.track.name}` : "Choisis un niveau dans ton profil pour découvrir tes cours."}
      </PageHeader>

      {!profile.levelId ? (
        <EmptyState title="Quel est ton niveau d’études ?" href="/profil" action="Compléter mon profil">
          Ton parcours de chapitres dépend du niveau associé à ton compte.
        </EmptyState>
      ) : semesters.size === 0 ? (
        <EmptyState title="Bientôt disponible">Aucun cours publié pour ce niveau pour le moment.</EmptyState>
      ) : (
        <div className="grid gap-8">
          {resume && (
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-accent/20 bg-[linear-gradient(135deg,rgba(29,35,68,.95),rgba(17,21,43,.98))] p-5 sm:p-6">
              <div className="min-w-0">
                <Eyebrow>Reprendre là où tu en étais</Eyebrow>
                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{resume.title}</h2>
                <p className="mt-1 text-sm text-muted">{resumeSubject} · Chapitre {resume.number}</p>
              </div>
              <Link href={`/parcours/${resume.id}`} className={primaryButton}>
                {resume.state?.readAt ? "Reprendre" : "Commencer"} <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </section>
          )}

          {semesterKeys.length > 1 && (
            <nav aria-label="Semestres" className="-mt-3 flex gap-2 overflow-x-auto pb-1">
              {semesterKeys.map((semester) => (
                <a key={semester ?? "none"} href={`#semestre-${semester ?? "autres"}`} className="shrink-0 rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-muted no-underline transition hover:border-accent/40 hover:text-fg">
                  {semester ? `Semestre ${semester}` : "Compléments"}
                </a>
              ))}
            </nav>
          )}

          {Array.from(semesters.entries()).map(([semester, semesterSubjects]) => (
            <section key={semester ?? "none"} id={`semestre-${semester ?? "autres"}`} className="scroll-mt-24">
              <h2 className="mb-4 text-xl font-semibold tracking-tight">{semester ? `Semestre ${semester}` : "Cours complémentaires"}</h2>
              <div className="grid items-start gap-4 md:grid-cols-2">
                {semesterSubjects.map((subject) => {
                  const total = subject.items.length;
                  const percent = total ? (subject.completed / total) * 100 : 0;
                  const status = total === 0 ? "Chapitres à venir" : subject.completed === total ? "Matière terminée" : `Chapitre ${(subject.next?.number ?? subject.completed + 1)} sur ${total}`;
                  return (
                    <details key={subject.id} open={!!subject.next && subject.next.id === resume?.id} className="group rounded-2xl border border-line bg-panel">
                      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 marker:hidden [&::-webkit-details-marker]:hidden">
                        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-bg2 text-lg text-accent">{subject.name.slice(0, 1).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-semibold">{subject.name}</span>
                          <span className="mt-0.5 block text-xs text-muted">{status}</span>
                          <ProgressBar percent={percent} className="mt-2.5" />
                        </span>
                        <span aria-hidden="true" className="text-muted transition group-open:rotate-90">›</span>
                      </summary>
                      <ol className="grid gap-2 border-t border-line p-4">
                        {subject.items.map((item) => {
                          const done = !!item.state?.completedAt;
                          const label = done ? "Validé" : item.state?.readAt ? "Quiz à faire" : item.unlocked ? "À lire" : "Verrouillé";
                          const badge = done ? "✓" : item.unlocked ? String(item.number).padStart(2, "0") : "🔒";
                          const body = (
                            <>
                              <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg border text-xs ${done ? "border-accent/40 bg-accent/[.12] text-accent" : "border-line text-muted"}`}>{badge}</span>
                              <span className="min-w-0 flex-1 truncate">{item.title}</span>
                              <span className={`shrink-0 text-xs ${done ? "text-accent" : "text-muted"}`}>{label}</span>
                            </>
                          );
                          return (
                            <li key={item.id}>
                              {item.unlocked ? (
                                <Link href={`/parcours/${item.id}`} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-bg2/70 px-3 text-sm text-fg no-underline transition hover:border-accent/40">{body}</Link>
                              ) : (
                                <div aria-disabled="true" className="flex min-h-12 items-center gap-3 rounded-xl border border-line/60 px-3 text-sm text-muted opacity-75">{body}</div>
                              )}
                            </li>
                          );
                        })}
                        {total === 0 && <li className="text-sm text-muted">Les chapitres de cette matière seront publiés prochainement.</li>}
                      </ol>
                    </details>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
