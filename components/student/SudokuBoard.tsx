"use client";

import { useState, useTransition } from "react";
import { submitSudoku } from "@/app/actions/games";

export default function SudokuBoard({ givens, finished }: { givens: (number | null)[]; finished: boolean }) {
  const [cells, setCells] = useState<(number | null)[]>(givens);
  const [message, setMessage] = useState<string | null>(finished ? "Grille déjà terminée aujourd’hui." : null);
  const [solved, setSolved] = useState(finished);
  const [pending, startTransition] = useTransition();
  const size = 6;

  function cycle(index: number) {
    if (givens[index] !== null || solved) return;
    setMessage(null);
    setCells((previous) => previous.map((value, position) => (position === index ? (value === null ? 0 : value === 0 ? 1 : null) : value)));
  }

  function conflicts(index: number) {
    const value = cells[index];
    if (value === null) return false;
    const row = Math.floor(index / size);
    const col = index % size;
    const at = (r: number, c: number) => (r >= 0 && r < size && c >= 0 && c < size ? cells[r * size + c] : null);
    const triple = (dr: number, dc: number) =>
      [[-2, -1], [-1, 1], [1, 2]].some(([a, b]) => at(row + dr * a, col + dc * a) === value && at(row + dr * b, col + dc * b) === value);
    if (triple(0, 1) || triple(1, 0)) return true;
    const rowCount = cells.slice(row * size, row * size + size).filter((cell) => cell === value).length;
    const colCount = Array.from({ length: size }, (_, r) => cells[r * size + col]).filter((cell) => cell === value).length;
    return rowCount > size / 2 || colCount > size / 2;
  }

  function check() {
    if (cells.some((value) => value === null)) {
      setMessage("Remplis toutes les cases avant de vérifier.");
      return;
    }
    startTransition(async () => {
      const result = await submitSudoku(cells as number[]);
      if (result.error !== null) setMessage(result.error);
      else if (result.correct) {
        setSolved(true);
        setMessage(`Bravo ! Grille résolue en ${result.seconds} s. +20 XP${result.badges.length ? ` · Nouveau badge : ${result.badges.map((badge) => badge.name).join(", ")}` : ""}`);
      } else setMessage("Pas encore : une ou plusieurs cases sont fausses. Regarde les cases en rouge.");
    });
  }

  return (
    <div className="mx-auto grid max-w-sm gap-5">
      <div className="grid grid-cols-6 gap-1.5" role="grid" aria-label="Sudoku binaire 6 par 6">
        {cells.map((value, index) => {
          const fixed = givens[index] !== null;
          return (
            <button
              key={index}
              type="button"
              onClick={() => cycle(index)}
              disabled={fixed || solved}
              aria-label={`Case ${Math.floor(index / size) + 1}, ${(index % size) + 1} : ${value === null ? "vide" : value}`}
              className={`aspect-square rounded-lg border text-xl font-semibold tabular-nums transition ${fixed ? "border-line bg-bg2 text-muted" : "border-line bg-panel-raised hover:border-accent/60"} ${!fixed && conflicts(index) ? "border-bad text-bad" : value !== null && !fixed ? "text-accent" : ""}`}
            >
              {value ?? ""}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted">Touche une case pour alterner vide, 0 et 1. Règles : pas plus de deux chiffres identiques de suite, autant de 0 que de 1 par ligne et par colonne, deux lignes (ou colonnes) jamais identiques.</p>
      {message && <p className="rounded-xl border border-line bg-panel px-4 py-3 text-sm" role="status">{message}</p>}
      {!solved && <button type="button" onClick={check} disabled={pending} className="inline-flex min-h-12 items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50">{pending ? "Vérification…" : "Vérifier la grille"}</button>}
    </div>
  );
}
