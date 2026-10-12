"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const goals = new Set(["exams", "regularity", "confidence"]);

export async function completeOnboarding(displayNameInput: string, goalInput: string) {
  const displayName = displayNameInput.trim();

  if (displayName.length < 2 || displayName.length > 60) {
    return { error: "Indique un prénom ou nom entre 2 et 60 caractères." };
  }
  if (!goals.has(goalInput)) {
    return { error: "Choisis un objectif de révision valide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Ta session a expiré. Reconnecte-toi pour continuer." };
  }
  if (!user.email) {
    return { error: "Aucune adresse e-mail n’est associée à ce compte." };
  }

  try {
    await prisma.profile.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email, displayName },
      update: { email: user.email, displayName },
    });
  } catch (error) {
    console.error("Onboarding profile update failed:", error);
    return { error: "Impossible d’enregistrer ton profil. Vérifie la connexion à la base puis réessaie." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      displayName,
      onboardingGoal: goalInput,
      onboardingCompleted: true,
    },
  });

  if (updateError) {
    return { error: `Le profil est enregistré, mais la session n’a pas pu être actualisée : ${updateError.message}` };
  }

  return { error: null };
}
