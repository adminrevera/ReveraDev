import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Eyebrow, PageHeader, primaryButton } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Révisions à faire · Revera" };

export default async function ReviewPage() {
  const { profile } = await requireStudentProfile();
  const schedules = await prisma.reviewSchedule.findMany({
    where: { userId: profile.id, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: 50,
    select: { questionKey: true },
  });
  const questions = profile.levelId && schedules.length ? await prisma.question.findMany({
    relationLoadStrategy: "join",
    where: {
      key: { in: schedules.map(({ questionKey }) => questionKey) },
      version: { status: "PUBLISHED", item: { kind: "CHAPTER", subject: { levelId: profile.levelId } } },
    },
    select: {
      key: true,
      text: true,
      version: { select: { item: { select: { id: true, title: true, subject: { select: { name: true } } } } } },
    },
  }) : [];
  const questionByKey = new Map(questions.map((question) => [question.key, question]));

  // Regroupe les questions dues par matière, dans l'ordre d'échéance.
  const groups = new Map<string, { subject: string; keys: string[] }>();
  const unavailable: string[] = [];
  for (const { questionKey } of schedules) {
    const question = questionByKey.get(questionKey);
    if (!question) {
      unavailable.push(questionKey);
      continue;
    }
    const subject = question.version.item.subject.name;
    const group = groups.get(subject) ?? { subject, keys: [] };
    group.keys.push(questionKey);
    groups.set(subject, group);
  }

  return (
    <>
      <PageHeader eyebrow="Mémorisation" title="À revoir">
        Une réponse juste espace la prochaine révision, une erreur la rapproche. Lance une série pour t’y mettre.
      </PageHeader>

      {!schedules.length ? (
        <EmptyState title="Rien à revoir pour le moment" href="/parcours" action="Continuer mon parcours">
          Les questions apparaissent ici après tes quiz de chapitre, quand leur date de révision arrive.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid min-w-0 gap-6">
            {Array.from(groups.values()).map((group) => (
              <section key={group.subject}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">{group.subject}</h2>
                  <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">{group.keys.length} à revoir</span>
                </div>
                <div className="grid gap-3">
                  {group.keys.map((key) => {
                    const question = questionByKey.get(key);
                    if (!question) return null;
                    return (
                      <article key={key} className="rounded-2xl border border-line bg-panel p-5">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-amber">{question.version.item.title}</p>
                        <h3 className="mt-2 font-semibold leading-relaxed">{question.text}</h3>
                        <Link href={`/parcours/${question.version.item.id}`} className="mt-2 inline-flex text-xs text-muted no-underline hover:text-fg">Revoir le chapitre →</Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            {unavailable.length > 0 && (
              <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
                {unavailable.length} question{unavailable.length > 1 ? "s ne sont" : " n’est"} pas disponible{unavailable.length > 1 ? "s" : ""} dans une version actuellement publiée. Elle{unavailable.length > 1 ? "s restent planifiées" : " reste planifiée"} ; contacte le support si cela persiste.
              </p>
            )}
          </div>

          <aside className="rounded-2xl border border-accent/25 bg-[linear-gradient(135deg,rgba(29,35,68,.95),rgba(17,21,43,.98))] p-5 lg:sticky lg:top-6">
            <Eyebrow>À revoir aujourd’hui</Eyebrow>
            <p className="mt-3 text-4xl font-semibold tracking-tight">{schedules.length}<span className="ml-2 text-base font-medium text-muted">question{schedules.length > 1 ? "s" : ""}</span></p>
            <p className="mt-2 text-sm leading-relaxed text-muted">Choisies d’après tes séances passées et le temps écoulé depuis la dernière révision.</p>
            <Link href="/seance/review" className={`${primaryButton} mt-5 w-full`}>Lancer la révision</Link>
            <Link href="/parcours" className="mt-3 block text-center text-xs text-muted no-underline hover:text-fg">Aller au parcours</Link>
          </aside>
        </div>
      )}
    </>
  );
}
