import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Lecture d'un réglage de l'application, mise en cache 2 minutes (invalidée par le tag « app-settings »).
const readSetting = unstable_cache(
  async (key: string) => {
    const setting = await prisma.appSetting.findUnique({ where: { key }, select: { value: true } });
    return { value: setting?.value ?? null };
  },
  ["app-setting"],
  { revalidate: 120, tags: ["app-settings"] },
);

export async function getAppSetting(key: string) {
  const { value } = await readSetting(key);
  return value;
}
