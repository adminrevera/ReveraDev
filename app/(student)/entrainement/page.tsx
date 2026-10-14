import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Eyebrow, PageHeader } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";
import { getQuizValidationPercent } from "@/lib/quiz-settings";

export const metadata: Metadata = { title: "Entraînement · Revera" };

const comingSoon = [
  { title: "Exercices", text: "Des séries d’exercices corrigés, comme ceux de ton cours." },
  { title: "Cartes de révision", text: "Retourne les cartes pour retenir les définitions." },
  { title: "Simulateur d’examen", text: "Chronométré, noté sur 20." },
];

export default async function TrainingPage() {
  const { profile } = await requireStudentProfile();
  const visibility = profile.tier === "FREE" ? "PUBLIC" : { in: ["PUBLIC", "PREMIUM"] as ("PUBLIC" | "PREMIUM")[] };
  const [subjects, validationPercent] = await Promise.all([
    profile.levelId
      ? prisma.subject.findMany({
          relationLoadStrategy: "join",
          where: { levelId: profile.levelId, visibility },
          orderBy: [{ semester: "asc" }, { position: "asc" }],
          select: {
            id: true,
            name: true,
            items: {
              where: {
                kind: "CHAPTER",
                publishedVersionId: { not: null },
                visibility,
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
        })
      : Promise.resolve([]),
    getQuizValidationPercent(),
  ]);

  return (
    <>
      <PageHeader eyebrow="Pratique" title="Entraînement">
        Tout ce qui s’entraîne repose sur les chapitres de ton Parcours. Lis d’abord le cours : le quiz se débloque ensuite et valide le chapitre à partir de {validationPercent} %.
      </PageHeader>

      <section aria-label="Activités" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/parcours" className="group rounded-2xl border border-accent/30 bg-accent/[.07] p-5 text-fg no-underline transition hover:border-accent/60">
          <Eyebrow>Disponible</Eyebrow>
          <h2 className="mt-2 text-lg font-semibold">Quiz de chapitre</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Six questions par chapitre, corrigées à la fin.</p>
          <span className="mt-3 inline-flex text-xs font-semibold text-accent">Choisir un chapitre <span aria-hidden="true" className="ml-1 transition group-hover:translate-x-0.5">→</span></span>
        </Link>
        {comingSoon.map((activity) => (
          <div key={activity.title} aria-disabled="true" className="rounded-2xl border border-dashed border-line bg-panel/50 p-5 opacity-80">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>Bientôt</Eyebrow>
              <span aria-hidden="true">🔒</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">{activity.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{activity.text}</p>
          </div>
        ))}
      </section>

      <h2 className="mb-4 mt-9 text-xl font-semibold tracking-tight">Lancer directement sur une matière</h2>
      {!profile.levelId ? (
        <EmptyState title="Renseigne ton niveau" href="/profil" action="Compléter mon profil">Ton niveau permet de trouver des quiz adaptés.</EmptyState>
      ) : subjects.length === 0 ? (
        <EmptyState title="Bientôt disponible">Aucun cours n’est encore publié pour ton niveau.</EmptyState>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {subjects.map((subject) => {
            const validated = subject.items.filter((item) => item.progress[0]?.completedAt).length;
            return (
              <article key={subject.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{subject.name}</h3>
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-muted">{validated} / {subject.items.length} validés</span>
                </div>
                <ul className="mt-3 grid gap-2">
                  {subject.items.map((item, index) => {
                    const progress = item.progress[0];
                    const unlocked = index === 0 || !!subject.items[index - 1]?.progress[0]?.completedAt;
                    const href = progress?.readAt ? `/quiz/${item.id}` : `/parcours/${item.id}`;
                    const label = progress?.readAt ? (progress.completedAt ? "Refaire le quiz" : "Faire le quiz") : "Lire le cours →";
                    return (
                      <li key={item.id}>
                        {unlocked ? (
                          <Link href={href} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-bg2 px-3.5 text-sm text-fg no-underline transition hover:border-accent/40">
                            <span className="min-w-0 truncate">{item.title}</span>
                            <span className="shrink-0 text-xs text-muted">{label}</span>
                          </Link>
                        ) : (
                          <div aria-disabled="true" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line/60 px-3.5 text-sm text-muted opacity-75">
                            <span className="min-w-0 truncate">{item.title}</span>
                            <span className="shrink-0 text-xs">🔒 Verrouillé</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {subject.items.length === 0 && <li className="text-sm text-muted">Les quiz apparaîtront à la publication des chapitres.</li>}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
