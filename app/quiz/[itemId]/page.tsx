import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QuizPlayer from "@/components/student/QuizPlayer";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { getStudentChapter } from "@/lib/student/content";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Quiz du chapitre · Revera" };

export default async function ChapterQuizPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { itemId } = await params;
  const item = await getStudentChapter(profile, itemId);
  if (!item?.publishedVersion) notFound();
  const progress = await prisma.chapterProgress.findUnique({
    where: { userId_itemId: { userId: profile.id, itemId: item.id } },
    select: { readAt: true, completedAt: true },
  });
  if (!progress?.readAt) notFound();

  return (
    <StudentShell role={profile.role}>
      <Link href={`/parcours/${item.id}`} className="text-sm text-muted no-underline hover:text-fg">← Retour au chapitre</Link>
      <header className="mx-auto mb-5 mt-5 max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">{item.subject.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{item.publishedVersion.title}</h1>
        <p className="mt-2 text-sm text-muted">{progress.completedAt ? "Chapitre déjà validé : tu peux refaire le quiz pour réviser." : "Réponds à toutes les questions. Le serveur calcule le score et valide le chapitre à 100 %."}</p>
      </header>
      <div className="mx-auto max-w-3xl"><QuizPlayer itemId={item.id} /></div>
    </StudentShell>
  );
}
