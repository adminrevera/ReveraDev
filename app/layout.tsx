import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Young_Serif } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/config";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Révise tes cours, entraîne-toi et prépare tes examens.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${youngSerif.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}