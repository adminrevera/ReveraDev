import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingForm from "@/components/auth/OnboardingForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: `Bienvenue · ${APP_NAME}`,
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Impossible de vérifier la session : ${error.message}`);
  }
  if (!user) redirect("/connexion");
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { displayName: true },
  });
  if (profile?.displayName) redirect("/dashboard");

  const levels = await prisma.level.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      track: { select: { name: true, institution: { select: { name: true } } } },
    },
  });

  const initialName =
    (typeof user.user_metadata?.displayName === "string" && user.user_metadata.displayName) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    "";
  const requestedPlan = ["free", "plus", "success"].includes(plan ?? "")
    ? (plan as "free" | "plus" | "success")
    : ["free", "plus", "success"].includes(user.user_metadata?.requestedPlan)
      ? (user.user_metadata.requestedPlan as "free" | "plus" | "success")
      : null;

  return (
    <AuthShell
      eyebrow="Bienvenue chez Revera"
      title={
        <>
          Faisons connaissance
          <span className="font-serif font-normal italic text-accent">.</span>
        </>
      }
      subtitle="Quelques détails suffisent pour préparer un espace qui te ressemble."
    >
      <OnboardingForm initialName={initialName} requestedPlan={requestedPlan} levels={levels} />
    </AuthShell>
  );
}
