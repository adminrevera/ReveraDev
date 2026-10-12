import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Connexion · ${APP_NAME}`,
  description: "Connecte-toi à Revera pour continuer tes révisions.",
};

const notices: Record<string, string> = {
  "auth-not-configured": "Le service de connexion n’est pas encore configuré.",
  "session-check-failed": "Ta session n’a pas pu être vérifiée. Essaie de te reconnecter.",
  "invalid-link": "Ce lien est invalide ou a expiré. Demande-en un nouveau.",
  "oauth-failed": "La connexion Google a échoué ou a été annulée. Réessaie.",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      eyebrow="Content de te revoir"
      title={
        <>
          Reprends là où tu
          <span className="font-serif font-normal italic text-lime"> en étais.</span>
        </>
      }
      subtitle="Connecte-toi pour retrouver ton espace de révision."
      footer={
        <>
          Pas encore de compte?{" "}
          <Link href="/inscription" className="font-semibold text-lime no-underline hover:underline">
            Créer mon compte
          </Link>
        </>
      }
    >
      {error && notices[error] && (
        <p className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn" role="alert">
          {notices[error]}
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
