import Link from "next/link";

// Barre du haut des écrans guidés : croix de sortie, barre de progression, compteur.
export default function FocusTopBar({
  exitHref,
  exitLabel,
  percent,
  counter,
}: {
  exitHref: string;
  exitLabel: string;
  percent: number;
  counter?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-8">
        <Link
          href={exitHref}
          aria-label={exitLabel}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-panel text-lg text-fg no-underline transition hover:border-accent/40"
        >
          <span aria-hidden="true">✕</span>
        </Link>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full border border-line bg-bg2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safe}
        >
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--amber))] transition-[width] duration-300" style={{ width: `${safe}%` }} />
        </div>
        {counter && <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">{counter}</span>}
      </div>
    </div>
  );
}
