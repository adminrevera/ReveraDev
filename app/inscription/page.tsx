import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Créer un compte · ${APP_NAME}`,
  description: "Crée ton compte Revera et commence à préparer tes examens.",
};

export default function InscriptionPage() {
  return (
    <AuthShell
      eyebrow="Ton prochain chapitre commence ici"
      title={
        <>
          Crée ton compte
          <span className="font-serif font-normal italic text-lime"> gratuitement.</span>
        </>
      }
      subtitle="Rejoins Revera et prépare tes examens à ton rythme."
      footer={
        <>
          Tu as déjà un compte?{" "}
          <Link href="/connexion" className="font-semibold text-lime no-underline hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
