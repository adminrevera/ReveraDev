import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuidedReader from "@/components/student/GuidedReader";
import CourseBody from "@/components/student/CourseBody";
import FocusTopBar from "@/components/student/FocusTopBar";
import { requireStudentProfile } from "@/lib/auth/access";
import { splitCourseParts } from "@/lib/course-format";
import { getStudentChapter } from "@/lib/student/content";

export const metadata: Metadata = { title: "Lire le chapitre · Revera" };

export default async function ChapterPage({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { profile } = await requireStudentProfile();
  const { itemId } = await params;
  const { mode } = await searchParams;
  const item = await getStudentChapter(profile, itemId);
  if (!item?.publishedVersion) notFound();
  const progress = item.progress[0] ?? null;
  const chapters = item.subject.items;
  const total = chapters.length;
  const position = Math.max(1, chapters.findIndex((chapter) => chapter.id === item.id) + 1);

  const body = item.publishedVersion.bodyHtml ?? "";
  // Tant que le chapitre n’est pas validé : lecture guidée partie par partie. Une fois validé : cours entier (ou partie par partie sur demande).
  const guided = Boolean(body) && (!progress?.completedAt || mode === "parts");
  const parts = guided ? splitCourseParts(body) : [];

  return (
    <>
      <FocusTopBar
        exitHref="/parcours"
        exitLabel="Quitter la lecture et revenir au parcours"
        percent={total ? (position / total) * 100 : 0}
        counter={total ? `${position} / ${total}` : undefined}
      />
      <main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-8 sm:px-6 sm:pt-10">
        <article className="course-reader">
          <header className="course-reader-header">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-amber">
              <span>{item.subject.name}</span><span aria-hidden="true" className="text-muted">/</span><span>Chapitre {item.number}</span>
              {progress?.completedAt && <span className="ml-auto rounded-full border border-accent/30 bg-accent/[.08] px-2.5 py-1 text-[10px] tracking-normal text-accent">Validé</span>}
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl">{item.publishedVersion.title}</h1>
            {item.publishedVersion.subtitle && <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">{item.publishedVersion.subtitle}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-muted">
              <span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${progress?.readAt ? "bg-accent" : "bg-amber"}`} />{progress?.readAt ? "Lecture enregistrée" : "À ton rythme, une partie à la fois"}</span>
              {progress?.bestQuizScore !== null && progress?.bestQuizScore !== undefined && <span>Meilleur score au quiz : {progress.bestQuizScore} %</span>}
            </div>
          </header>
          {body ? (
            guided ? (
              <GuidedReader
                itemId={item.id}
                parts={parts.map((part) => ({ title: part.title, node: <CourseBody html={part.html} /> }))}
                partsRead={progress?.partsRead ?? 0}
                alreadyRead={Boolean(progress?.readAt)}
                completed={Boolean(progress?.completedAt)}
              />
            ) : (
              <CourseBody html={body} />
            )
          ) : (
            <p className="course-empty">Le texte de ce chapitre n’est pas encore renseigné.</p>
          )}
          {!guided && progress?.completedAt && (
            <p className="mt-8 text-center text-sm text-muted">
              Fin du cours. <Link href={`/parcours/${item.id}?mode=parts`} className="text-accent underline underline-offset-4">Relire partie par partie</Link>
            </p>
          )}
        </article>
      </main>
      {!guided && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            <Link href={`/quiz/${item.id}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink no-underline transition hover:brightness-110">
              Refaire le quiz du chapitre <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
