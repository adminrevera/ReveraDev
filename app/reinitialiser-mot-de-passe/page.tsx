import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Nouveau mot de passe · ${APP_NAME}`,
};

export default function ReinitialiserMotDePassePage() {
  return (
    <AuthShell
      eyebrow="Dernière étape"
      title={
        <>
          Choisis un nouveau
          <span className="font-serif font-normal italic text-accent"> mot de passe.</span>
        </>
      }
      subtitle="Utilise un mot de passe d’au moins 8 caractères que tu n’emploies pas ailleurs."
      footer={
        <Link href="/connexion" className="font-semibold text-accent no-underline hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
