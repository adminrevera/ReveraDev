import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startChapterQuiz, submitChapterQuiz } from "@/app/actions/quiz";
import QuizPlayer from "@/components/student/QuizPlayer";
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
    <QuizPlayer
      start={startChapterQuiz.bind(null, item.id)}
      submitAnswers={submitChapterQuiz}
      exitHref={`/parcours/${item.id}`}
      doneHref="/parcours"
      title={item.subject.name}
      validationPercent={validationPercent}
    />
  );
}
