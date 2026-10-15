import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startPractice, submitPractice, type PracticeKind } from "@/app/actions/practice";
import QuizPlayer from "@/components/student/QuizPlayer";
import { requireStudentProfile } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Séance · Revera" };

const config: Record<PracticeKind, { title: string; exit: string; done: string; retry: string }> = {
  review: { title: "Révision espacée", exit: "/reviser", done: "/reviser", retry: "Une autre série" },
  errors: { title: "Mes erreurs", exit: "/erreurs", done: "/erreurs", retry: "Une autre série" },
  bank: { title: "Entraînement", exit: "/entrainement", done: "/entrainement", retry: "Une autre série" },
};

export default async function PracticePage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ scope?: string }> }) {
  await requireStudentProfile();
  const { kind } = await params;
  const { scope } = await searchParams;
  if (kind !== "review" && kind !== "errors" && kind !== "bank") notFound();
  const entry = config[kind];
  return (
    <QuizPlayer
      start={startPractice.bind(null, kind, scope)}
      submitAnswers={submitPractice}
      exitHref={entry.exit}
      doneHref={entry.done}
      doneLabel="Terminer"
      title={entry.title}
      retryLabel={entry.retry}
    />
  );
}
