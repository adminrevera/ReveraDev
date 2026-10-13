import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CourseBody from "@/components/student/CourseBody";
import ChapterReadMarker from "@/components/student/ChapterReadMarker";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { getStudentChapter } from "@/lib/student/content";

export const metadata: Metadata = { title: "Lire le chapitre · Revera" };

export default async function ChapterPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { itemId } = await params;
  const item = await getStudentChapter(profile, itemId);
  if (!item?.publishedVersion) notFound();
  const progress = item.progress[0] ?? null;

  return (
    <StudentShell role={profile.role}>
      <div className="mx-auto max-w-5xl">
        <Link href="/parcours" className="inline-flex min-h-10 items-center text-sm text-muted no-underline transition hover:text-fg">← Retour à mon parcours</Link>
        <article className="course-reader mt-3">
          <header className="course-reader-header">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[.14em] text-amber">
              <span>{item.subject.name}</span><span aria-hidden="true" className="text-muted">/</span><span>Chapitre {item.number}</span>
              {progress?.completedAt && <span className="ml-auto rounded-full border border-accent/30 bg-accent/[.08] px-2.5 py-1 text-[10px] tracking-normal text-accent">Validé</span>}
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl">{item.publishedVersion.title}</h1>
            {item.publishedVersion.subtitle && <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">{item.publishedVersion.subtitle}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-muted">
              <span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${progress?.readAt ? "bg-accent" : "bg-amber"}`} />{progress?.readAt ? "Lecture enregistrée" : "À ton rythme, prends le temps de comprendre"}</span>
              {progress?.bestQuizScore !== null && progress?.bestQuizScore !== undefined && <span>Meilleur score au quiz : {progress.bestQuizScore} %</span>}
            </div>
          </header>
          {item.publishedVersion.bodyHtml ? (
            <CourseBody html={item.publishedVersion.bodyHtml} />
          ) : (
            <p className="course-empty">Le texte de ce chapitre n’est pas encore renseigné.</p>
          )}
        {progress?.readAt ? (
          <div className="course-next-step">
            <div><p className="text-sm font-semibold">{progress.completedAt ? "Chapitre validé" : "Prêt·e à vérifier tes acquis ?"}</p><p className="mt-1 text-xs text-muted">{progress.completedAt ? "Tu peux refaire le quiz pour consolider tes connaissances." : "Le quiz apparaît à la fin de la lecture."}</p></div>
            <Link href={`/quiz/${item.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink no-underline transition hover:brightness-110">
              {progress.completedAt ? "Refaire le quiz" : "Commencer le quiz"} <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>
        ) : <ChapterReadMarker itemId={item.id} />}
        </article>
      </div>
    </StudentShell>
  );
}
