import type { Metadata } from "next";
import Link from "next/link";
import { openTodayGame } from "@/app/actions/games";
import WordGame from "@/components/student/WordGame";
import { PageHeader } from "@/components/student/ui";

export const metadata: Metadata = { title: "Mot 404 · Revera" };

export default async function WordPage() {
  const game = await openTodayGame("WORDS_404");
  return (
    <>
      <PageHeader eyebrow="Jeux du jour" title="Mot 404">
        <Link href="/jeux" className="text-accent no-underline">← Tous les jeux</Link>
      </PageHeader>
      {game.error !== null ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{game.error}</p>
      ) : (
        <WordGame initial={game.guesses} finished={game.finished} answer={game.answer} />
      )}
    </>
  );
}
