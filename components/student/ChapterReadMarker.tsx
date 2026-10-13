"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markChapterRead } from "@/app/actions/quiz";

export default function ChapterReadMarker({ itemId }: { itemId: string }) {
  const markerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const router = useRouter();
  const [message, setMessage] = useState("Poursuis jusqu’ici pour débloquer le quiz du chapitre.");
  const [canConfirm, setCanConfirm] = useState(false);

  const confirmRead = useCallback(async () => {
    setCanConfirm(false);
    setMessage("Enregistrement de la lecture…");
    try {
      const result = await markChapterRead(itemId);
      if (result.error) {
        setMessage(result.error);
        setCanConfirm(true);
        startedRef.current = false;
        return;
      }
      router.refresh();
    } catch (error) {
      console.error("Chapter reading progress could not be saved:", error);
      setMessage("La lecture n’a pas pu être enregistrée. Réessaie.");
      setCanConfirm(true);
      startedRef.current = false;
    }
  }, [itemId, router]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !("IntersectionObserver" in window)) {
      setMessage("Lis le chapitre jusqu’au bout et valide sa lecture pour débloquer le quiz.");
      setCanConfirm(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || startedRef.current) return;
      startedRef.current = true;
      void confirmRead();
    }, { threshold: 0.1 });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [confirmRead]);

  return <div ref={markerRef} className="mt-8 min-h-14 rounded-xl border border-line bg-bg2 p-4 text-sm text-muted" aria-live="polite">
    <p>{message}</p>
    {canConfirm && <button type="button" onClick={() => void confirmRead()} className="mt-3 inline-flex min-h-10 items-center rounded-full border border-accent/40 px-4 text-sm font-semibold text-fg">J’ai terminé la lecture</button>}
  </div>;
}
