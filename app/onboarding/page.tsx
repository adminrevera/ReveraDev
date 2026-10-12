import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingForm from "@/components/auth/OnboardingForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Bienvenue · ${APP_NAME}`,
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Impossible de vérifier la session : ${error.message}`);
  }
  if (!user) redirect("/connexion");
  if (user.user_metadata?.onboardingCompleted) redirect("/dashboard");

  const initialName =
    (typeof user.user_metadata?.displayName === "string" && user.user_metadata.displayName) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    "";

  return (
    <AuthShell
      eyebrow="Bienvenue chez Revera"
      title={
        <>
          Faisons connaissance
          <span className="font-serif font-normal italic text-lime">.</span>
        </>
      }
      subtitle="Quelques détails suffisent pour préparer un espace qui te ressemble."
    >
      <OnboardingForm initialName={initialName} />
    </AuthShell>
  );
}
