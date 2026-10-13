"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!event.currentTarget.reportValidity()) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser-mot-de-passe`,
      });

      if (error) {
        setErrorMessage(`Impossible d’envoyer le lien : ${error.message}`);
        return;
      }

      setRequestSent(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de contacter le service de récupération. Réessaie.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (requestSent) {
    return (
      <div className="rounded-2xl border border-ok/30 bg-ok/10 p-5" role="status" aria-live="polite">
        <h2 className="font-semibold text-ok">Vérifie ta boîte e-mail</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg/80">
          Si un compte est associé à cette adresse, tu recevras un lien pour choisir un nouveau
          mot de passe.
        </p>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-2">
        <label htmlFor="recovery-email" className="text-sm font-medium">
          Adresse e-mail
        </label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="toi@exemple.com"
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
        {isSubmitting ? "Envoi du lien…" : "Envoyer le lien"}
      </button>
    </form>
  );
}
