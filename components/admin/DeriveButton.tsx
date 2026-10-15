"use client";

import { useState, useTransition } from "react";
import { deriveQuestionBank } from "@/app/admin/studio-actions";
import { adminButton } from "./AdminShell";

/** « Compléter les formats » : crée des versions en relecture avec les formats de questions manquants (dérivés du cours). */
export default function DeriveButton({ itemId, subjectId, label = "Compléter les formats" }: { itemId?: string; subjectId?: string; label?: string }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={adminButton} disabled={pending}
        onClick={() => start(async () => {
          try {
            const result = await deriveQuestionBank({ itemId, subjectId });
            setMessage(result.questionsCreated ? `${result.questionsCreated} question(s) ajoutée(s) dans ${result.versionsCreated} version(s) à relire.` : (result.skipped[0] ?? "Rien à ajouter."));
          } catch (error) { setMessage(error instanceof Error ? error.message : "Échec."); }
        })}>
        {pending ? "Dérivation…" : label}
      </button>
      {message && <span role="status" className="text-xs text-muted">{message}</span>}
    </span>
  );
}
