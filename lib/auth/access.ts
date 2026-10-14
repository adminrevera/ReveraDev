import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { VERIFIED_USER_ID_HEADER } from "./request-context";
import { measureServerOperation } from "@/lib/server-performance";

export async function getSignedInProfile() {
  const requestHeaders = await headers();
  const headerUserId = requestHeaders.get(VERIFIED_USER_ID_HEADER);
  let userId = headerUserId && z.string().uuid().safeParse(headerUserId).success ? headerUserId : null;

  if (!userId) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await measureServerOperation("auth.server.getUserFallback", () => supabase.auth.getUser());
    if (error) throw new Error(`Impossible de vérifier la session : ${error.message}`);
    if (!user) return null;
    userId = user.id;
  }

  const profile = await measureServerOperation("auth.profile.findUnique", () => prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      levelId: true,
      timezone: true,
      xpTotal: true,
      bestStreak: true,
      tier: true,
      suspendedAt: true,
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
  }));

  return profile ? { user: { id: profile.id }, profile } : null;
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
