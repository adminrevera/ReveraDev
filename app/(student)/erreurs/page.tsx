import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { EmptyState, Eyebrow, PageHeader, primaryButton } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mes erreurs · Revera" };

export default async function MistakesPage() {
  const { profile } = await requireStudentProfile();
  // Une erreur reste dans la liste tant que la question n'a pas été réussie depuis.
  const rows = await prisma.$queryRaw<{ questionId: string; text: string; chapter: string; chapterId: string | null; subject: string; misses: bigint }[]>(Prisma.sql`
    SELECT q."id" AS "questionId", q."text" AS "text", ci."title" AS "chapter", ci."id" AS "chapterId", s."name" AS "subject", COUNT(*) AS "misses"
    FROM "Attempt" a
    JOIN "Question" q ON q."id" = a."questionId"
    JOIN "ContentVersion" cv ON cv."id" = q."versionId"
    JOIN "ContentItem" ci ON ci."id" = cv."itemId"
    JOIN "Subject" s ON s."id" = ci."subjectId"
    WHERE a."userId" = ${profile.id}::uuid AND NOT a."isCorrect"
      AND NOT EXISTS (SELECT 1 FROM "Attempt" b WHERE b."userId" = a."userId" AND b."questionId" = a."questionId" AND b."isCorrect" AND b."answeredAt" > a."answeredAt")
    GROUP BY q."id", q."text", ci."title", ci."id", s."name"
    ORDER BY MAX(a."answeredAt") DESC
    LIMIT 60`);

  const bySubject = new Map<string, typeof rows>();
  for (const row of rows) bySubject.set(row.subject, [...(bySubject.get(row.subject) ?? []), row]);

  return (
    <>
      <PageHeader eyebrow="Progresser" title="Mes erreurs">
        Les questions que tu as ratées restent ici jusqu’à ce que tu les réussisses. Retravaille-les en série de dix.
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState title="Aucune erreur à retravailler" href="/entrainement" action="Aller s’entraîner">
          Quand tu rates une question dans un quiz ou une séance, elle apparaît ici.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid min-w-0 gap-6">
            {Array.from(bySubject.entries()).map(([subject, list]) => (
              <section key={subject}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">{subject}</h2>
                  <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">{list.length}</span>
                </div>
                <div className="grid gap-3">
                  {list.map((row) => (
                    <article key={row.questionId} className="rounded-2xl border border-line bg-panel p-5">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-amber">{row.chapter}</p>
                      <h3 className="mt-2 font-semibold leading-relaxed">{row.text}</h3>
                      <p className="mt-2 text-xs text-muted">Ratée {Number(row.misses)} fois</p>
                      {row.chapterId && <Link href={`/parcours/${row.chapterId}?mode=parts`} className="mt-2 inline-flex text-xs text-muted no-underline hover:text-fg">Relire le chapitre →</Link>}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className="rounded-2xl border border-accent/25 bg-[linear-gradient(135deg,rgba(29,35,68,.95),rgba(17,21,43,.98))] p-5 lg:sticky lg:top-6">
            <Eyebrow>À retravailler</Eyebrow>
            <p className="mt-3 text-4xl font-semibold tracking-tight">{rows.length}<span className="ml-2 text-base font-medium text-muted">question{rows.length > 1 ? "s" : ""}</span></p>
            <Link href="/seance/errors" className={`${primaryButton} mt-5 w-full`}>Retravailler mes erreurs</Link>
          </aside>
        </div>
      )}
    </>
  );
}
