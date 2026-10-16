"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { advanceChapterPart, touchChapter } from "@/app/actions/reading";

type Props = {
  itemId: string;
  parts: { title: string | null; node: ReactNode }[];
  partsRead: number;
  alreadyRead: boolean;
  completed: boolean;
};

// Lecture guidée : une partie à la fois, « Continuer » enregistré côté serveur.
export default function GuidedReader({ itemId, parts, partsRead, alreadyRead, completed }: Props) {
  const router = useRouter();
  const total = parts.length;
  const [unlocked, setUnlocked] = useState(alreadyRead ? total : Math.min(partsRead + 1, total));
  const [index, setIndex] = useState(alreadyRead ? 0 : Math.min(partsRead, total - 1));
  const [finished, setFinished] = useState(alreadyRead);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (partsRead === 0 && !alreadyRead) void touchChapter(itemId);
  }, [alreadyRead, itemId, partsRead]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [index]);

  const last = index === total - 1;

  function next() {
    setMessage(null);
    if (index < unlocked - 1 || finished) {
      if (!last) setIndex(index + 1);
      return;
    }
    startTransition(async () => {
      const result = await advanceChapterPart(itemId, index);
      if (result.error !== null) {
        setMessage(result.error);
        return;
      }
      if (result.finished) {
        setFinished(true);
        setUnlocked(total);
        router.refresh();
        return;
      }
      setUnlocked(Math.max(unlocked, index + 2));
      setIndex(index + 1);
    });
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3 text-xs text-muted" aria-live="polite">
        <span className="font-mono uppercase tracking-[.14em] text-amber">Partie {index + 1} sur {total}</span>
        {parts[index].title && <span className="truncate">{parts[index].title}</span>}
      </div>
      <div className="mb-8 flex gap-1.5" aria-hidden="true">
        {parts.map((part, position) => (
          <span key={position} className={`h-1.5 flex-1 rounded-full ${position === index ? "bg-amber" : finished || position < unlocked - 1 ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
      <div key={index} className="animate-[journey-arrive_.35s_ease-out_both]">{parts[index].node}</div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {message && <p className="text-center text-xs text-warn" role="alert">{message}</p>}
          <div className="flex gap-3">
            {index > 0 && (
              <button type="button" onClick={() => setIndex(index - 1)} className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-fg transition hover:border-accent/40">
                Précédent
              </button>
            )}
            {last && finished ? (
              <Link href={`/quiz/${itemId}`} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink no-underline transition hover:brightness-110">
                {completed ? "Refaire le quiz du chapitre" : "Valider avec le quiz"} <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            ) : (
              <button type="button" onClick={next} disabled={pending} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-60">
                {pending ? "Enregistrement…" : last ? "J’ai terminé la lecture" : "Continuer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
