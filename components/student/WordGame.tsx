"use client";

import { useState, useTransition } from "react";
import { submitWordGuess } from "@/app/actions/games";

type Row = { guess: string; score: number[] };
const tone = ["border-line bg-panel text-muted", "border-amber bg-amber/20 text-amber", "border-ok bg-ok/20 text-ok"];

export default function WordGame({ initial, finished, answer }: { initial: Row[]; finished: boolean; answer: string | null }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [value, setValue] = useState("");
  const [over, setOver] = useState(finished);
  const [revealed, setRevealed] = useState<string | null>(answer);
  const [message, setMessage] = useState<string | null>(finished ? "Partie déjà terminée aujourd’hui." : null);
  const [pending, startTransition] = useTransition();
  const tries = 6;

  function submit() {
    const guess = value.trim().toUpperCase();
    if (!/^[A-Z]{5}$/.test(guess)) {
      setMessage("Entre un mot de 5 lettres, sans accent.");
      return;
    }
    startTransition(async () => {
      const result = await submitWordGuess(guess);
      if (result.error !== null) {
        setMessage(result.error);
        return;
      }
      setRows((previous) => [...previous, { guess, score: result.score }]);
      setValue("");
      setMessage(null);
      if (result.over) {
        setOver(true);
        setRevealed(result.answer);
        setMessage(result.won ? `Trouvé en ${rows.length + 1} essai${rows.length ? "s" : ""} ! +20 XP${result.badges.length ? ` · Nouveau badge : ${result.badges.map((badge) => badge.name).join(", ")}` : ""}` : `Perdu : le mot était ${result.answer}.`);
      }
    });
  }

  return (
    <div className="mx-auto grid max-w-sm gap-5">
      <div className="grid gap-1.5" aria-label="Essais">
        {Array.from({ length: tries }, (_, rowIndex) => {
          const row = rows[rowIndex];
          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }, (_, col) => (
                <span key={col} className={`grid aspect-square place-items-center rounded-lg border text-xl font-semibold ${row ? tone[row.score[col]] : "border-line bg-bg2"}`}>
                  {row?.guess[col] ?? ""}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      {!over && (
        <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex gap-2">
          <input
            value={value} onChange={(event) => setValue(event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 5))}
            maxLength={5} autoComplete="off" autoCapitalize="characters" aria-label="Ton mot"
            className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-panel px-5 text-center text-lg font-semibold uppercase tracking-[.3em] outline-none focus:border-accent/70"
            placeholder="MOTS"
          />
          <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center rounded-full border border-accent bg-accent px-6 text-sm font-semibold text-accent-ink disabled:opacity-50">{pending ? "…" : "Valider"}</button>
        </form>
      )}
      <p className="text-xs leading-relaxed text-muted">Un mot informatique de 5 lettres, 6 essais. Vert : bonne lettre bien placée. Ambre : lettre présente ailleurs.</p>
      {message && <p className="rounded-xl border border-line bg-panel px-4 py-3 text-sm" role="status">{message}{over && revealed && !message.includes(revealed) ? ` Mot : ${revealed}.` : ""}</p>}
    </div>
  );
}
