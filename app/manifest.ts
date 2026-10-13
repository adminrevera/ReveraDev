import type { MetadataRoute } from "next";

// Permet d'installer Revera sur l'écran d'accueil.
// À placer dans app/manifest.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Revera",
    short_name: "Revera",
    description: "Révise tes cours, entraîne-toi et prépare tes examens.",
    start_url: "/",
    display: "standalone",
    lang: "fr",
    background_color: "#0b0d1c",
    theme_color: "#0b0d1c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
