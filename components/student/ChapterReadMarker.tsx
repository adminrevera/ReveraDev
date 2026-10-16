"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markChapterRead, startChapterReading } from "@/app/actions/reading";

export default function ChapterReadMarker({ itemId }: { itemId: string }) {
  const markerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const readyRef = useRef(false);
  const bottomReachedRef = useRef(false);
  const minimumSecondsRef = useRef(0);
  const timerStartedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const generationRef = useRef(0);
  const router = useRouter();
  const [message, setMessage] = useState("Préparation de la lecture…");
  const [canConfirm, setCanConfirm] = useState(false);

  const confirmRead = useCallback(async () => {
    if (!readyRef.current || !bottomReachedRef.current || startedRef.current) return;

    const elapsedSeconds = (performance.now() - timerStartedAtRef.current) / 1000;
    const remainingSeconds = minimumSecondsRef.current - elapsedSeconds;
    if (remainingSeconds > 0) {
      setMessage(`Tu as atteint la fin du cours. Patiente encore ${Math.ceil(remainingSeconds)} seconde${remainingSeconds >= 1.5 ? "s" : ""} pour valider ta lecture.`);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void confirmRead();
      }, Math.ceil(remainingSeconds * 1000));
      return;
    }

    startedRef.current = true;
    setCanConfirm(false);
    setMessage("Enregistrement de la lecture…");
    try {
      const result = await markChapterRead(itemId);
      if (result.error !== null) {
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

  const startReading = useCallback(async (generation: number) => {
    setCanConfirm(false);
    setMessage("Démarrage du chronomètre de lecture…");
    try {
      const result = await startChapterReading(itemId);
      if (generation !== generationRef.current) return;
      if (result.error !== null) {
        setMessage(result.error);
        setCanConfirm(true);
        return;
      }
      if (result.alreadyRead) {
        router.refresh();
        return;
      }

      readyRef.current = true;
      minimumSecondsRef.current = result.minimumSeconds;
      timerStartedAtRef.current = performance.now();
      setMessage(
        result.minimumSeconds
          ? `Lis le cours jusqu’à la fin et prends au moins ${result.minimumSeconds} secondes pour cette lecture.`
          : "Lis le cours jusqu’à la fin pour débloquer le quiz.",
      );

      const marker = markerRef.current;
      if (!marker || !("IntersectionObserver" in window)) {
        setCanConfirm(true);
        return;
      }

      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || bottomReachedRef.current) return;
        bottomReachedRef.current = true;
        void confirmRead();
      }, { threshold: 0.1 });
      observerRef.current.observe(marker);
    } catch (error) {
      if (generation !== generationRef.current) return;
      console.error("Chapter reading could not be started:", error);
      setMessage("Le chronomètre n’a pas pu démarrer. Réessaie.");
      setCanConfirm(true);
    }
  }, [confirmRead, itemId, router]);

  useEffect(() => {
    const generation = ++generationRef.current;
    const generationTracker = generationRef;
    startedRef.current = false;
    readyRef.current = false;
    bottomReachedRef.current = false;
    void startReading(generation);
    return () => {
      if (generationTracker.current === generation) generationTracker.current++;
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [startReading]);

  function handleConfirm() {
    if (!readyRef.current) {
      void startReading(generationRef.current);
      return;
    }
    bottomReachedRef.current = true;
    void confirmRead();
  }

  return (
    <>
      {/* Repère invisible placé à la fin du cours : quand il apparaît à l'écran, la lecture est terminée. */}
      <div ref={markerRef} aria-hidden="true" className="h-px" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8" aria-live="polite">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <p className="text-center text-xs leading-relaxed text-muted">{message}</p>
          {canConfirm ? (
            <button type="button" onClick={handleConfirm} className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink transition hover:brightness-110">
              J’ai terminé la lecture
            </button>
          ) : (
            <span className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-dashed border-line px-6 text-center text-sm text-muted">
              Lis le cours jusqu’au bout pour débloquer le quiz
            </span>
          )}
        </div>
      </div>
    </>
  );
}
