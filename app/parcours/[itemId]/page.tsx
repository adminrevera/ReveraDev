import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChapterReadMarker from "@/components/student/ChapterReadMarker";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { bodyHtmlToText, getStudentChapter } from "@/lib/student/content";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Lire le chapitre · Revera" };

export default async function ChapterPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { itemId } = await params;
  const item = await getStudentChapter(profile, itemId);
  if (!item?.publishedVersion) notFound();
  const progress = await prisma.chapterProgress.findUnique({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    select: { readAt: true, completedAt: true, bestQuizScore: true },
  });
  const content = bodyHtmlToText(item.publishedVersion.bodyHtml);

  return (
    <StudentShell role={profile.role}>
      <Link href="/parcours" className="text-sm text-muted no-underline hover:text-fg">← Retour à mon parcours</Link>
      <article className="mx-auto mt-5 max-w-3xl rounded-2xl border border-line bg-panel p-5 sm:p-9">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">{item.subject.name} · Chapitre {item.number}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{item.publishedVersion.title}</h1>
        {item.publishedVersion.subtitle && <p className="mt-3 text-lg text-muted">{item.publishedVersion.subtitle}</p>}
        {content ? (
          <div className="mt-8 whitespace-pre-wrap text-[15px] leading-8 text-fg/90">{content}</div>
        ) : (
          <p className="mt-8 rounded-xl border border-line bg-bg2 p-4 text-sm text-muted">Le texte de ce chapitre n’est pas encore renseigné.</p>
        )}
        {progress?.readAt ? (
          <div className="mt-8 rounded-xl border border-accent/30 bg-accent/[.06] p-4">
            <p className="text-sm font-semibold">{progress.completedAt ? "Chapitre validé" : "Lecture terminée"}</p>
            {progress.bestQuizScore !== null && <p className="mt-1 text-sm text-muted">Meilleur score : {progress.bestQuizScore} %</p>}
            <Link href={`/quiz/${item.id}`} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink no-underline hover:brightness-110">
              {progress.completedAt ? "Refaire le quiz" : "Commencer le quiz"}
            </Link>
          </div>
        ) : <ChapterReadMarker itemId={item.id} />}
      </article>
    </StudentShell>
  );
}
