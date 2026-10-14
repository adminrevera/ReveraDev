import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Créer un compte · ${APP_NAME}`,
  description: "Crée ton compte Revera et commence à préparer tes examens.",
};

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const selectedPlan = plan === "plus" || plan === "success" ? plan : "free";

  return <SignupForm selectedPlan={selectedPlan} />;
}
