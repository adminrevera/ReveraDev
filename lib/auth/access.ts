import { Role } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getSignedInProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(`Impossible de vérifier la session : ${error.message}`);
  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: {
      level: {
        select: {
          name: true,
          track: {
            select: {
              name: true,
              institution: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return profile ? { user, profile } : null;
}

export async function requireStudentProfile() {
  const session = await getSignedInProfile();
  if (!session) redirect("/connexion");
  if (session.profile.suspendedAt) redirect("/connexion?error=account-suspended");
  if (session.profile.role !== Role.ADMIN && !session.profile.displayName) redirect("/onboarding");
  return session;
}

export async function requireAdminPage() {
  const session = await getSignedInProfile();
  if (!session || session.profile.role !== Role.ADMIN || session.profile.suspendedAt) notFound();
  return session;
}

export async function requireAdminAction() {
  const session = await getSignedInProfile();
  if (!session || session.profile.role !== Role.ADMIN || session.profile.suspendedAt) {
    throw new Error("Accès refusé.");
  }
  return session;
}
