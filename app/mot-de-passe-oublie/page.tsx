import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Mot de passe oublié · ${APP_NAME}`,
};

export default function MotDePasseOubliePage() {
  return (
    <AuthShell
      eyebrow="Récupération du compte"
      title={
        <>
          On va retrouver
          <span className="font-serif font-normal italic text-accent"> l’accès.</span>
        </>
      }
      subtitle="Indique l’adresse e-mail associée à ton compte. Nous t’enverrons un lien sécurisé."
      footer={
        <Link href="/connexion" className="font-semibold text-accent no-underline hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
