"use client";

import { useState } from "react";
import Lumi, { type LumiMood } from "@/components/brand/Lumi";

const moods: LumiMood[] = ["contente", "studieuse", "base", "fatiguee"];

const moodCopy: Record<LumiMood, string> = {
  base: "On avance à ton rythme, un pas après l’autre.",
  studieuse: "Concentre-toi sur une petite étape, je reste avec toi.",
  contente: "Belle énergie ! Garde cet élan pour la suite.",
  fatiguee: "Une pause compte aussi dans ton parcours.",
};

export default function LumiCompanion({
  context,
  message,
  initialMood = "base",
}: {
  context: string;
  message: string;
  initialMood?: LumiMood;
}) {
  const [moodIndex, setMoodIndex] = useState(Math.max(0, moods.indexOf(initialMood)));
  const mood = moods[moodIndex];
  const leftMood = moods[(moodIndex + 1) % moods.length];
  const rightMood = moods[(moodIndex + 2) % moods.length];

  return (
    <section className="lumi-companion overflow-hidden rounded-2xl border border-accent/20 bg-[radial-gradient(ellipse_at_50%_5%,rgba(170,181,255,.12),transparent_62%),linear-gradient(145deg,rgba(29,35,68,.86),rgba(17,21,43,.96))] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Ton compagnon</p>
          <p className="mt-1 text-xs text-muted">{context}</p>
        </div>
        <span className="rounded-full border border-accent/20 bg-accent/[.07] px-2.5 py-1 text-[10px] text-accent">Lumi</span>
      </div>
      <div className="lumi-3d-scene relative mx-auto mt-3 flex h-[142px] max-w-[290px] items-end justify-center" aria-label="Lumi, ton compagnon de révision">
        <span aria-hidden="true" className="lumi-3d-orbit" />
        <span aria-hidden="true" className="lumi-3d-spark lumi-3d-spark-a">✦</span>
        <span aria-hidden="true" className="lumi-3d-spark lumi-3d-spark-b">✧</span>
        <div aria-hidden="true" className="lumi-3d-model lumi-3d-model-back lumi-3d-model-left">
          <Lumi mood={leftMood} size={62} title="" />
        </div>
        <div aria-hidden="true" className="lumi-3d-model lumi-3d-model-back lumi-3d-model-right">
          <Lumi mood={rightMood} size={58} title="" />
        </div>
        <div className="lumi-3d-model lumi-3d-model-front">
          <Lumi mood={mood} size={104} title="Lumi, ton compagnon de révision" />
        </div>
      </div>
      <p className="min-h-[2.5rem] text-center text-sm leading-relaxed text-fg" aria-live="polite">
        {mood === initialMood ? message : moodCopy[mood]}
      </p>
      <button
        type="button"
        onClick={() => setMoodIndex((index) => (index + 1) % moods.length)}
        className="mt-3 min-h-10 w-full rounded-xl border border-line bg-white/[.025] px-3 text-xs font-medium text-muted transition hover:border-accent/30 hover:text-fg"
        aria-label="Faire changer de pose à Lumi"
      >
        Voir une autre pose <span aria-hidden="true" className="ml-1 text-accent">↻</span>
      </button>
    </section>
  );
}
