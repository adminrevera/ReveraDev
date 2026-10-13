"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markQuestionReviewed } from "@/app/actions/review";

export default function ReviewConfirmButton({ questionKey }: { questionKey: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    setError("");
    startTransition(async () => {
      try {
        const result = await markQuestionReviewed(questionKey);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (cause) {
        console.error("Review scheduling update failed:", cause);
        setError("La prochaine révision n’a pas pu être planifiée.");
      }
    });
  }

  return <div className="mt-3">
    <button type="button" onClick={confirm} disabled={pending} className="inline-flex min-h-9 items-center rounded-full border border-accent/40 px-4 text-xs font-semibold text-fg disabled:opacity-50">{pending ? "Mise à jour…" : "J’ai révisé cette question"}</button>
    {error && <p className="mt-2 text-xs text-bad" role="alert">{error}</p>}
  </div>;
}
