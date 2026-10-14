import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const DEFAULT_READING_MIN_SECONDS = 60;
export const MAX_READING_MIN_SECONDS = 3600;

// Réglage lu très souvent et rarement modifié : mis en cache 60 s, invalidé par l'admin (tag « app-settings »).
const readReadingSetting = unstable_cache(
  async () => {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "reading.minSeconds" },
      select: { value: true },
    });
    return { value: setting?.value ?? null };
  },
  ["app-setting-reading-min-seconds"],
  { revalidate: 60, tags: ["app-settings"] },
);

export async function getReadingMinimumSeconds() {
  const { value } = await readReadingSetting();
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
