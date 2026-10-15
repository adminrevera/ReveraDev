type Category = "DISCOVERY" | "REGULARITY" | "MASTERY" | "COMPETITION" | "EVENT";

const palette: Record<Category, { ring: string; glow: string }> = {
  DISCOVERY: { ring: "#aab5ff", glow: "rgba(170,181,255,.35)" },
  REGULARITY: { ring: "#ffd27a", glow: "rgba(255,210,122,.35)" },
  MASTERY: { ring: "#83d9b2", glow: "rgba(131,217,178,.35)" },
  COMPETITION: { ring: "#ff9fa8", glow: "rgba(255,159,168,.35)" },
  EVENT: { ring: "#c4a6ff", glow: "rgba(196,166,255,.35)" },
};

// Médaille géométrique : un motif par catégorie, grisée tant que le badge n'est pas obtenu.
function Glyph({ category, color }: { category: Category; color: string }) {
  switch (category) {
    case "DISCOVERY": return <path d="M32 14 L38 28 L52 32 L38 36 L32 50 L26 36 L12 32 L26 28 Z" fill={color} />;
    case "REGULARITY": return <path d="M32 12 C40 24 46 28 46 38 A14 14 0 0 1 18 38 C18 30 24 28 26 20 C28 24 30 24 32 12 Z" fill={color} />;
    case "MASTERY": return <path d="M32 12 L48 20 V34 C48 44 40 50 32 54 C24 50 16 44 16 34 V20 Z" fill={color} />;
    case "COMPETITION": return <path d="M20 16 H44 V26 C44 34 38 40 32 40 C26 40 20 34 20 26 Z M28 40 H36 V48 H42 V52 H22 V48 H28 Z" fill={color} />;
    default: return <path d="M32 12 L36 26 L50 22 L40 32 L50 42 L36 38 L32 52 L28 38 L14 42 L24 32 L14 22 L28 26 Z" fill={color} />;
  }
}

export default function BadgeMedal({ category, earned, size = 64 }: { category: Category; earned: boolean; size?: number }) {
  const colors = palette[category];
  const ring = earned ? colors.ring : "#4a5075";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={earned ? "Badge obtenu" : "Badge à débloquer"} style={earned ? { filter: `drop-shadow(0 6px 14px ${colors.glow})` } : undefined}>
      <circle cx="32" cy="32" r="29" fill="#11152b" stroke={ring} strokeWidth="3" />
      <circle cx="32" cy="32" r="24" fill="none" stroke={ring} strokeWidth="1" strokeDasharray="2 4" opacity=".6" />
      <g transform="translate(8 8) scale(.75)" opacity={earned ? 1 : 0.55}><Glyph category={category} color={ring} /></g>
    </svg>
  );
}
