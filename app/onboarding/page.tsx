import type { Metadata } from "next";
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

  // Les deux lectures sont indépendantes : on les lance en même temps.
  const [profile, levels] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { displayName: true } }),
    prisma.level.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        track: { select: { name: true, institution: { select: { name: true } } } },
      },
    }),
  ]);
  if (profile?.displayName) redirect("/onboarding/bienvenue");

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

  return <OnboardingForm initialName={initialName} requestedPlan={requestedPlan} levels={levels} />;
}
