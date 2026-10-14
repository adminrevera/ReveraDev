"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import FlowShell from "@/components/auth/FlowShell";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";

const inputClass =
  "min-h-14 w-full rounded-2xl border border-line bg-black/25 px-4 text-[16px] text-fg outline-none transition placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/15";
const primary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-5 text-[15px] font-semibold text-accent-ink shadow-[0_10px_40px_-10px_var(--glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";
const outline =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-panel px-5 text-[15px] font-semibold text-fg no-underline transition hover:border-accent/40";

export default function SignupForm({ selectedPlan }: { selectedPlan: "free" | "plus" | "success" }) {
  const router = useRouter();
  const [screen, setScreen] = useState<"method" | "credentials">("method");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);

  const formValid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8 && confirmation.length >= 8;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!formValid) {
      setErrorMessage("Saisis une adresse e-mail valide et un mot de passe d’au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    try {
      getSupabaseConfig();
    } catch {
      setErrorMessage("Le service d’inscription n’est pas configuré. Réessaie plus tard.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          data: { requestedPlan: selectedPlan },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      setConfirmationSent(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Impossible de créer le compte : ${error.message}`
          : "Impossible de contacter le service d’inscription. Vérifie ta connexion et réessaie.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmationSent) {
    return (
      <FlowShell
        step={2}
        total={5}
        title="Vérifie ta boîte e-mail"
        subtitle="Un lien de confirmation vient de t’être envoyé."
        footer={<button type="button" className={outline} onClick={() => { setConfirmationSent(false); setScreen("credentials"); }}>Changer d’adresse e-mail</button>}
      >
        <div className="rounded-2xl border border-ok/30 bg-ok/10 p-5" role="status" aria-live="polite">
          <p className="text-sm leading-relaxed text-fg/80">
            Si l’adresse est valide, un lien a été envoyé à <strong className="break-all text-fg">{email.trim()}</strong>. Ouvre-le pour activer ton compte : tu continueras ensuite avec quelques questions.
          </p>
        </div>
      </FlowShell>
    );
  }

  if (screen === "method") {
    return (
      <FlowShell
        step={1}
        total={5}
        backHref="/"
        title="Crée ton compte"
        subtitle="Choisis comment tu veux t’inscrire."
        footer={
          <p className="text-center text-sm text-muted">
            Tu as déjà un compte ? <Link href="/connexion" className="font-semibold text-accent no-underline hover:underline">Se connecter</Link>
          </p>
        }
      >
        <GoogleAuthButton label="Continuer avec Google" selectedPlan={selectedPlan} />
        <div className="flex items-center gap-3 py-1" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">ou</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <button type="button" className={primary} onClick={() => setScreen("credentials")}>Continuer avec une adresse e-mail</button>
      </FlowShell>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FlowShell
        step={2}
        total={5}
        onBack={() => { setErrorMessage(""); setScreen("method"); }}
        title="Ton e-mail et ton mot de passe"
        subtitle="Tu t’en serviras pour te reconnecter."
        footer={
          <>
            {errorMessage && <p className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-[#FFD2CB]" role="alert">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting || !formValid} className={primary}>{isSubmitting ? "Création du compte…" : "Créer mon compte"}</button>
          </>
        }
      >
        <div className="grid gap-2">
          <label htmlFor="signup-email" className="text-sm font-medium">Adresse e-mail</label>
          <input id="signup-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@exemple.com" className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="signup-password" className="text-sm font-medium">Mot de passe</label>
          <input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="signup-confirmation" className="text-sm font-medium">Confirmer le mot de passe</label>
          <input id="signup-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Saisis à nouveau ton mot de passe" className={inputClass} />
        </div>
      </FlowShell>
    </form>
  );
}
