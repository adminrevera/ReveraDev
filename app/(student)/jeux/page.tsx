import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, PageHeader } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Jeux · Revera" };

export default async function GamesPage() {
  const { profile } = await requireStudentProfile();
  const day = localCalendarDay(new Date(), "Africa/Lome");
  const sessions = await prisma.gameSession.findMany({
    where: { userId: profile.id, puzzle: { day } },
    select: { finishedAt: true, success: true, puzzle: { select: { kind: true } } },
  });
  const status = (kind: string) => {
    const session = sessions.find((row) => row.puzzle.kind === kind);
    return !session ? "À jouer" : session.finishedAt ? (session.success ? "Réussi" : "Terminé") : "En cours";
  };
  const games = [
    { href: "/jeux/sudoku", kind: "BINARY_SUDOKU", title: "Sudoku binaire", text: "Remplis la grille 6×6 avec des 0 et des 1, sans jamais en aligner trois." },
    { href: "/jeux/mot", kind: "WORDS_404", title: "Mot 404", text: "Trouve le mot informatique du jour en six essais." },
  ];
  return (
    <>
      <PageHeader eyebrow="Pause utile" title="Jeux du jour">
        Une grille et un mot nouveaux chaque jour, les mêmes pour tout le monde. Terminer un jeu compte pour ta série et tes quêtes.
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {games.map((game) => (
          <Link key={game.kind} href={game.href} className="rounded-2xl border border-line bg-panel p-6 text-fg no-underline transition hover:border-accent/40">
            <div className="flex items-center justify-between"><Eyebrow>Aujourd’hui</Eyebrow><span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{status(game.kind)}</span></div>
            <h2 className="mt-3 text-xl font-semibold">{game.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{game.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
