"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export async function updateStudentLevel(levelIdInput: string) {
  const { profile } = await requireStudentProfile();
  const parsed = z.string().uuid().safeParse(levelIdInput);
  if (!parsed.success) return { error: "Choisis un niveau d’études valide." };
  const level = await prisma.level.findUnique({ where: { id: parsed.data }, select: { id: true } });
  if (!level) return { error: "Ce niveau n’est plus disponible." };

  await prisma.profile.update({ where: { id: profile.id }, data: { levelId: level.id } });
  revalidatePath("/dashboard");
  revalidatePath("/parcours");
  revalidatePath("/entrainement");
  revalidatePath("/profil");
  return { error: null };
}
