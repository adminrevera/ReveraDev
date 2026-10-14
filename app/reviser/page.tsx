import type { Metadata } from "next";
import Link from "next/link";
import ReviewConfirmButton from "@/components/student/ReviewConfirmButton";
import StudentShell from "@/components/student/StudentShell";
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

  return (
    <StudentShell role={profile.role}>
      <header className="mb-7">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Mémorisation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">À revoir</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Revois les questions dues, puis confirme pour espacer progressivement la prochaine révision.</p>
      </header>
      {!schedules.length ? <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="text-xl font-semibold">Rien à revoir pour le moment</h2><p className="mt-2 text-sm text-muted">Les fiches apparaîtront ici lorsque le planning de révision sera alimenté par tes séances.</p><Link href="/parcours" className="mt-4 inline-flex text-sm font-semibold text-accent no-underline">Continuer mon parcours →</Link>
      </section> : (
        <div className="grid gap-3">
          {schedules.map((schedule) => {
            const question = questionByKey.get(schedule.questionKey);
            return <article key={schedule.questionKey} className="rounded-2xl border border-line bg-panel p-5">
              {question ? <>
                <p className="font-mono text-[10px] uppercase tracking-widest text-amber">{question.version.item.subject.name} · {question.version.item.title}</p>
                <h2 className="mt-2 font-semibold leading-relaxed">{question.text}</h2>
                <Link href={`/parcours/${question.version.item.id}`} className="mt-2 inline-flex text-xs text-muted no-underline hover:text-fg">Revoir le chapitre →</Link>
                <ReviewConfirmButton questionKey={schedule.questionKey} />
              </> : <p className="text-sm text-muted">Cette question n’est pas disponible dans une version actuellement publiée. Elle reste planifiée ; contacte le support si cela persiste.</p>}
            </article>;
          })}
        </div>
      )}
    </StudentShell>
  );
}
