"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { createClient } from "@/lib/supabase/client";

function getLoginError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirme ton adresse e-mail avant de te connecter.";
  }
  if (/rate limit|too many requests/i.test(message)) {
    return "Trop de tentatives. Patiente un instant avant de réessayer.";
  }
  return `Connexion impossible : ${message}`;
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!event.currentTarget.reportValidity()) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(getLoginError(error.message));
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de contacter le service de connexion. Réessaie.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <GoogleAuthButton label="Continuer avec Google" />
      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">ou par e-mail</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-2">
        <label htmlFor="login-email" className="text-sm font-medium">
          Adresse e-mail
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="toi@exemple.com"
          className="min-h-12 rounded-xl border border-line bg-black/25 px-4 text-[15px] text-fg outline-none transition placeholder:text-muted/70 focus:border-lime/70 focus:ring-2 focus:ring-lime/15"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="login-password" className="text-sm font-medium">
            Mot de passe
          </label>
          <Link
            href="/mot-de-passe-oublie"
            className="text-xs font-medium text-lime no-underline hover:underline"
          >
            Mot de passe oublié?
          </Link>
        </div>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ton mot de passe"
          className="min-h-12 rounded-xl border border-line bg-black/25 px-4 text-[15px] text-fg outline-none transition placeholder:text-muted/70 focus:border-lime/70 focus:ring-2 focus:ring-lime/15"
        />
      </div>

      {errorMessage && (
        <p
          className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-[#FFD2CB]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 inline-flex min-h-12 items-center justify-center rounded-full border border-lime bg-lime px-5 text-[15px] font-semibold text-lime-ink shadow-[0_10px_40px_-10px_var(--glow)] transition hover:-translate-y-px hover:shadow-[0_0_0_6px_rgba(212,255,61,.14),0_10px_40px_-8px_var(--glow)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Connexion…" : "Se connecter"}
      </button>
      </form>
    </div>
  );
}
