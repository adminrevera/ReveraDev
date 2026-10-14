"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/brand/Logo";

// Écran d'un parcours guidé (inscription, accueil du nouvel étudiant) : une seule question par écran,
// barre de progression en haut, bouton principal collé en bas.
export default function FlowShell({
  step,
  total,
  title,
  subtitle,
  onBack,
  backHref,
  footer,
  children,
}: {
  step: number;
  total: number;
  title: ReactNode;
  subtitle?: string;
  onBack?: () => void;
  backHref?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  const percent = Math.round((step / total) * 100);
  const backClass = "grid size-10 shrink-0 place-items-center rounded-full border border-line bg-panel text-lg text-fg no-underline transition hover:border-accent/40";
  return (
    <main className="relative isolate flex min-h-svh flex-col">
      <div aria-hidden="true" className="halo pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div className="border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-3">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label="Étape précédente" className={backClass}><span aria-hidden="true">←</span></button>
          ) : backHref ? (
            <Link href={backHref} aria-label="Retour" className={backClass}><span aria-hidden="true">←</span></Link>
          ) : (
            <span className="grid size-10 shrink-0 place-items-center"><Logo height={26} /></span>
          )}
          <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-line bg-bg2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--amber))] transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">{step} / {total}</span>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pb-8 pt-9">
        <h1 className="text-[clamp(28px,7vw,36px)] font-semibold leading-[1.1] tracking-[-0.04em] [overflow-wrap:anywhere]">{title}</h1>
        {subtitle && <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-7 grid gap-4">{children}</div>
      </div>
      <div className="sticky bottom-0 border-t border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto grid max-w-[460px] gap-2 px-5 py-3">{footer}</div>
      </div>
    </main>
  );
}
