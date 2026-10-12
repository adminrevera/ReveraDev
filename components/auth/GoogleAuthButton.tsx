"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleAuthButton({ label }: { label: string }) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleAuth() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", "/onboarding");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });

      if (error) {
        setErrorMessage(
          /provider is not enabled|unsupported provider/i.test(error.message)
            ? "La connexion Google n’est pas encore activée dans la configuration Supabase."
            : `Connexion Google impossible : ${error.message}`,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de contacter le service de connexion Google. Réessaie.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-line bg-white px-5 text-[15px] font-semibold text-[#202124] transition hover:-translate-y-px hover:bg-[#f7f8f8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
          <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
          <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
        </svg>
        {isSubmitting ? "Redirection vers Google…" : label}
      </button>
      {errorMessage && (
        <p
          className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-[#FFD2CB]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
