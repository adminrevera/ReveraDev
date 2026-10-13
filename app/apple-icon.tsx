import { ImageResponse } from "next/og";

// Icône iOS (écran d'accueil), générée en PNG par Next.js.
// À placer dans app/apple-icon.tsx
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Pleine page (iOS arrondit lui-même les coins), avec le détail complet de Lumi.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2E3690"/>
      <stop offset="1" stop-color="#12153A"/>
    </linearGradient>
    <radialGradient id="gl" cx="50%" cy="72%" r="55%">
      <stop offset="0" stop-color="#FFD27A" stop-opacity=".3"/>
      <stop offset="1" stop-color="#FFD27A" stop-opacity="0"/>
    </radialGradient>
    <mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="230">
      <rect width="200" height="230" fill="#fff"/>
      <ellipse cx="82" cy="86" rx="9" ry="12" fill="#000"/>
      <ellipse cx="118" cy="86" rx="9" ry="12" fill="#000"/>
      <path d="M88 104 Q100 116 112 104" stroke="#000" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cx="100" cy="84" r="50" stroke="#000" stroke-width="4" fill="none"/>
      <path d="M64 168 Q100 180 136 168" stroke="#000" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M62 190 Q100 204 138 190" stroke="#000" stroke-width="4" stroke-linecap="round" fill="none"/>
    </mask>
  </defs>
  <rect width="120" height="120" fill="url(#bg)"/>
  <rect width="120" height="120" fill="url(#gl)"/>
  <g transform="translate(24 17) scale(.36)" fill="#FFD27A" stroke="#FFD27A">
    <g mask="url(#m)">
      <path d="M84 112 C42 104 12 76 22 48 C32 24 72 44 92 88 Z" stroke="none"/>
      <path d="M116 112 C158 104 188 76 178 48 C168 24 128 44 108 88 Z" stroke="none"/>
      <path d="M84 44 C80 24 66 12 48 10" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M116 44 C120 24 134 12 152 10" stroke-width="7" stroke-linecap="round" fill="none"/>
      <circle cx="46" cy="10" r="8" stroke="none"/>
      <circle cx="154" cy="10" r="8" stroke="none"/>
      <circle cx="100" cy="84" r="50" stroke="none"/>
      <path d="M100 124 C70 124 54 154 60 182 C66 210 86 222 100 222 C114 222 134 210 140 182 C146 154 130 124 100 124 Z" stroke="none"/>
    </g>
  </g>
</svg>`;

export default function AppleIcon() {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={180} height={180} alt="" />
    ),
    { ...size },
  );
}
