"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        setErrorMessage(`Impossible de fermer la session : ${error.message}`);
        return;
      }
      router.replace("/connexion");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible de fermer la session. Réessaie.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid justify-items-end gap-2">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSubmitting}
        className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-fg disabled:opacity-60"
      >
        {isSubmitting ? "Déconnexion…" : "Se déconnecter"}
      </button>
      {errorMessage && (
        <p className="max-w-64 text-right text-xs text-[#FFD2CB]" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
