"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!event.currentTarget.reportValidity()) return;

    if (password !== confirmation) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !data.user) {
        setErrorMessage("Le lien de réinitialisation a expiré. Demande-en un nouveau.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(`Impossible de modifier le mot de passe : ${error.message}`);
        return;
      }

      setPasswordUpdated(true);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de contacter le service de compte. Réessaie.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (passwordUpdated) {
    return (
      <div className="grid gap-4">
        <p className="rounded-2xl border border-ok/30 bg-ok/10 p-5 text-sm leading-relaxed text-fg/80" role="status">
          Ton mot de passe a été modifié. Tu peux maintenant accéder à ton espace.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/dashboard")}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-accent bg-accent px-5 text-[15px] font-semibold text-accent-ink"
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-2">
        <label htmlFor="new-password" className="text-sm font-medium">
          Nouveau mot de passe
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8 caractères minimum"
          className="min-h-12 rounded-xl border border-line bg-black/25 px-4 text-[15px] text-fg outline-none transition placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/15"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="confirm-new-password" className="text-sm font-medium">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm-new-password"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Saisis-le une seconde fois"
          className="min-h-12 rounded-xl border border-line bg-black/25 px-4 text-[15px] text-fg outline-none transition placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/15"
        />
      </div>

      {errorMessage && (
        <p className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-[#FFD2CB]" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-accent bg-accent px-5 text-[15px] font-semibold text-accent-ink transition hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Modification…" : "Enregistrer le nouveau mot de passe"}
      </button>
    </form>
  );
}
