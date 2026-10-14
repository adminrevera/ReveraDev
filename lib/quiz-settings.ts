import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const DEFAULT_QUIZ_VALIDATION_PERCENT = 100;

// Réglage lu très souvent et rarement modifié : mis en cache 60 s, invalidé par l'admin (tag « app-settings »).
const readValidationSetting = unstable_cache(
  async () => {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "quiz.validationPercent" },
      select: { value: true },
    });
    return { value: setting?.value ?? null };
  },
  ["app-setting-quiz-validation-percent"],
  { revalidate: 60, tags: ["app-settings"] },
);

export async function getQuizValidationPercent() {
  const { value } = await readValidationSetting();
  if (value === null || value === undefined) return DEFAULT_QUIZ_VALIDATION_PERCENT;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Le réglage quiz.validationPercent doit être un entier entre 1 et 100.");
  }
  return value;
}
