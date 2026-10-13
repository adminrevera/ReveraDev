"use client";

import { useId, type CSSProperties } from "react";

export type LogoTone = "amber" | "light" | "ink" | "sun";

const TONES: Record<LogoTone, { mark: string; text: string; halo: string }> = {
  amber: { mark: "#FFD27A", text: "#EEF0FF", halo: "rgba(255,210,122,.45)" },
  light: { mark: "#EEF0FF", text: "#EEF0FF", halo: "rgba(238,240,255,.30)" },
  ink: { mark: "#1A1F3D", text: "#1A1F3D", halo: "rgba(26,31,61,.0)" },
  sun: { mark: "#14183A", text: "#14183A", halo: "rgba(20,24,58,.0)" },
};

type MarkProps = {
  /** hauteur en px (la largeur suit : 200 × 230) */
  size?: number;
  color?: string;
  className?: string;
};

export function LumiMark({ size = 40, color = "#FFD27A", className = "" }: MarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `lumi-mask-${uid}`;
  // En petit format, on épaissit les antennes et on retire les détails fins.
  const small = size < 48;

  return (
    <svg
      viewBox="0 0 200 230"
      width={(size * 200) / 230}
      height={size}
      style={{ color }}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="230">
          <rect width="200" height="230" fill="#fff" />
          <ellipse cx="82" cy="86" rx={small ? 10 : 8.5} ry={small ? 13 : 11} fill="#000" />
          <ellipse cx="118" cy="86" rx={small ? 10 : 8.5} ry={small ? 13 : 11} fill="#000" />
          {!small && <path d="M88 104 Q100 116 112 104" stroke="#000" strokeWidth="5" strokeLinecap="round" fill="none" />}
          <circle cx="100" cy="84" r="50" stroke="#000" strokeWidth={small ? 5 : 4} fill="none" />
          {!small && (
            <>
              <path d="M64 168 Q100 180 136 168" stroke="#000" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M62 190 Q100 204 138 190" stroke="#000" strokeWidth="4" strokeLinecap="round" fill="none" />
            </>
          )}
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path className="logo-wing-l" d="M84 112 C42 104 12 76 22 48 C32 24 72 44 92 88 Z" fill="currentColor" />
        <path className="logo-wing-r" d="M116 112 C158 104 188 76 178 48 C168 24 128 44 108 88 Z" fill="currentColor" />
        <path d="M84 44 C80 24 66 12 48 10" stroke="currentColor" strokeWidth={small ? 9 : 7} strokeLinecap="round" fill="none" />
        <path d="M116 44 C120 24 134 12 152 10" stroke="currentColor" strokeWidth={small ? 9 : 7} strokeLinecap="round" fill="none" />
        <circle cx="46" cy="10" r={small ? 9 : 8} fill="currentColor" />
        <circle cx="154" cy="10" r={small ? 9 : 8} fill="currentColor" />
        <circle cx="100" cy="84" r="50" fill="currentColor" />
        <path d="M100 124 C70 124 54 154 60 182 C66 210 86 222 100 222 C114 222 134 210 140 182 C146 154 130 124 100 124 Z" fill="currentColor" />
      </g>
    </svg>
  );
}

type LogoProps = {
  /** hauteur de la silhouette en px (le texte s'adapte) */
  height?: number;
  tone?: LogoTone;
  /** entrée en douceur + réaction au survol */
  animated?: boolean;
  /** masquer le nom, ne garder que Lumi */
  markOnly?: boolean;
  className?: string;
};

export default function Logo({ height = 40, tone = "amber", animated = true, markOnly = false, className = "" }: LogoProps) {
  const t = TONES[tone];

  return (
    <span
      className={`logo ${animated ? "logo-animated" : ""} ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: height * 0.15, lineHeight: 1 }}
      aria-label="Revera"
      role="img"
    >
      <span
        className="logo-mark"
        style={
          {
            position: "relative",
            display: "inline-flex",
            "--logo-halo": t.halo,
          } as CSSProperties
        }
      >
        <span className="logo-halo" aria-hidden="true" />
        <LumiMark size={height} color={t.mark} />
      </span>
      {!markOnly && (
        <span
          className="logo-word"
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-young-serif), Georgia, serif",
            fontWeight: 400,
            fontSize: height * 0.85,
            letterSpacing: "-0.01em",
            color: t.text,
          }}
        >
          Revera
        </span>
      )}
    </span>
  );
}
