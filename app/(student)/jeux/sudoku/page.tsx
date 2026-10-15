import type { Metadata } from "next";
import Link from "next/link";
import { openTodayGame } from "@/app/actions/games";
import SudokuBoard from "@/components/student/SudokuBoard";
import { PageHeader } from "@/components/student/ui";

export const metadata: Metadata = { title: "Sudoku binaire · Revera" };

export default async function SudokuPage() {
  const game = await openTodayGame("BINARY_SUDOKU");
  return (
    <>
      <PageHeader eyebrow="Jeux du jour" title="Sudoku binaire">
        <Link href="/jeux" className="text-accent no-underline">← Tous les jeux</Link>
      </PageHeader>
      {game.error !== null || !game.givens ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{game.error ?? "La grille n’est pas disponible."}</p>
      ) : (
        <SudokuBoard givens={game.givens} finished={game.finished} />
      )}
    </>
  );
}
