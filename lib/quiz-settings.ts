import { prisma } from "@/lib/prisma";

export const DEFAULT_QUIZ_VALIDATION_PERCENT = 100;

export async function getQuizValidationPercent() {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "quiz.validationPercent" },
    select: { value: true },
  });
  const value = setting?.value;
  if (value === null || value === undefined) return DEFAULT_QUIZ_VALIDATION_PERCENT;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Le réglage quiz.validationPercent doit être un entier entre 1 et 100.");
  }
  return value;
}
