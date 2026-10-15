"use server";

import { prisma } from "@/lib/prisma";
import { getFirstCourse } from "@/lib/student/first-course";
import { createClient } from "@/lib/supabase/server";

const goals = new Set(["exams", "regularity", "confidence", "gaps", "ahead", "compete"]);
const plans = new Set(["free", "plus", "success"]);

export async function completeOnboarding(
  displayNameInput: string,
  goalsInput: string[],
  requestedPlan: string | null = null,
  levelIdInput: string | null = null,
  reminders: { push: boolean; email: boolean; time: string } = { push: false, email: false, time: "18:00" },
) {
  const displayName = displayNameInput.trim();

  if (displayName.length < 2 || displayName.length > 60) {
    return { error: "Indique un prénom ou nom entre 2 et 60 caractères." };
  }
  const chosenGoals = Array.from(new Set(goalsInput)).filter((goal) => goals.has(goal));
  if (!chosenGoals.length || chosenGoals.length !== new Set(goalsInput).size) {
    return { error: "Choisis au moins un objectif." };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminders.time)) {
    return { error: "L’heure du rappel n’est pas valide." };
  }
  if (requestedPlan !== null && !plans.has(requestedPlan)) {
    return { error: "L’offre sélectionnée n’est pas valide. Choisis une offre proposée." };
  }
  if (levelIdInput !== null && !/^[0-9a-f-]{36}$/i.test(levelIdInput)) {
    return { error: "Choisis un niveau d’études valide." };
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
    if (levelIdInput) {
      const level = await prisma.level.findUnique({ where: { id: levelIdInput }, select: { id: true } });
      if (!level) return { error: "Ce niveau d’études n’est plus disponible." };
    }

    await prisma.profile.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email, displayName, goals: chosenGoals, ...(levelIdInput ? { levelId: levelIdInput } : {}) },
      update: { email: user.email, displayName, goals: chosenGoals, ...(levelIdInput ? { levelId: levelIdInput } : {}) },
    });
    const topics = { reminderTime: reminders.time };
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, pushEnabled: reminders.push, emailEnabled: reminders.email, topics },
      update: { pushEnabled: reminders.push, emailEnabled: reminders.email, topics },
    });
  } catch (error) {
    console.error("Onboarding profile update failed:", error);
    return { error: "Impossible d’enregistrer ton profil. Vérifie la connexion à la base puis réessaie." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      displayName,
      onboardingGoals: chosenGoals,
      onboardingCompleted: true,
      ...(requestedPlan ? { requestedPlan } : {}),
    },
  });

  if (updateError) {
    return { error: `Le profil est enregistré, mais la session n’a pas pu être actualisée : ${updateError.message}` };
  }

  const first = levelIdInput ? await getFirstCourse(levelIdInput).catch(() => null) : null;
  return { error: null, firstItemId: first?.id ?? null, firstTitle: first ? `${first.subject.name} · ${first.title}` : null };
}
