"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export async function markQuestionReviewed(questionKeyInput: string) {
  const { profile } = await requireStudentProfile();
  const parsed = z.string().trim().min(1).max(180).safeParse(questionKeyInput);
  if (!parsed.success) return { error: "Cette fiche de révision n’est pas valide." };
  const schedule = await prisma.reviewSchedule.findUnique({
    where: { userId_questionKey: { userId: profile.id, questionKey: parsed.data } },
    select: { halfLifeHours: true },
  });
  if (!schedule) return { error: "Cette fiche n’est plus dans ta liste de révision." };

  const now = new Date();
  const halfLifeHours = Math.min(schedule.halfLifeHours * 2, 24 * 30);
  await prisma.reviewSchedule.update({
    where: { userId_questionKey: { userId: profile.id, questionKey: parsed.data } },
    data: { lastReviewedAt: now, halfLifeHours, dueAt: new Date(now.getTime() + halfLifeHours * 3_600_000) },
  });
  revalidatePath("/reviser");
  revalidatePath("/dashboard");
  return { error: null };
}
