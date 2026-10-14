import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QuizPlayer from "@/components/student/QuizPlayer";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { getStudentChapter } from "@/lib/student/content";
import { getQuizValidationPercent } from "@/lib/quiz-settings";

export const metadata: Metadata = { title: "Quiz du chapitre · Revera" };

export default async function ChapterQuizPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { itemId } = await params;
  const [item, validationPercent] = await Promise.all([
    getStudentChapter(profile, itemId),
    getQuizValidationPercent(),
  ]);
  if (!item?.publishedVersion) notFound();
  const progress = item.progress[0];
  if (!progress?.readAt) notFound();

  return (
    <StudentShell role={profile.role}>
      <Link href={`/parcours/${item.id}`} className="text-sm text-muted no-underline hover:text-fg">← Retour au chapitre</Link>
      <header className="mx-auto mb-5 mt-5 max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">{item.subject.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{item.publishedVersion.title}</h1>
        <p className="mt-2 text-sm text-muted">{progress.completedAt ? "Chapitre déjà validé : tu peux refaire le quiz pour réviser." : `Réponds à toutes les questions. Le serveur calcule le score et valide le chapitre à partir de ${validationPercent} %.`}</p>
      </header>
      <div className="mx-auto max-w-3xl"><QuizPlayer itemId={item.id} validationPercent={validationPercent} /></div>
    </StudentShell>
  );
}
