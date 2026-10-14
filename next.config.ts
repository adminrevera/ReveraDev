import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Garde en mémoire dans le navigateur les écrans déjà visités : revenir sur un écran est instantané.
    // Les actions qui modifient des données (quiz, lecture, révision) appellent revalidatePath, ce qui vide ce cache.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
