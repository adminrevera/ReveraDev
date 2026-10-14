import { prisma } from "@/lib/prisma";

export const DEFAULT_READING_MIN_SECONDS = 60;
export const MAX_READING_MIN_SECONDS = 3600;

export async function getReadingMinimumSeconds() {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "reading.minSeconds" },
    select: { value: true },
  });
  const value = setting?.value;
  if (value === null || value === undefined) return DEFAULT_READING_MIN_SECONDS;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_READING_MIN_SECONDS
  ) {
    throw new Error("Le réglage reading.minSeconds doit être un entier entre 0 et 3600.");
  }
  return value;
}
