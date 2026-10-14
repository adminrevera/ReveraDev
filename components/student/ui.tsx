import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 sm:mb-8">
      <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{children}</div>}
    </header>
  );
}

export function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`h-2 overflow-hidden rounded-full border border-line bg-bg ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}>
      <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--amber))] transition-[width] duration-300" style={{ width: `${safe}%` }} />
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">{children}</p>;
}

export function EmptyState({ title, children, href, action }: { title: string; children: ReactNode; href?: string; action?: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-panel/60 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{children}</p>
      {href && action && (
        <Link href={href} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-accent/40 px-5 text-sm font-semibold text-fg no-underline transition hover:bg-accent/[.08]">
          {action}
        </Link>
      )}
    </section>
  );
}

export const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink no-underline shadow-[0_10px_40px_-12px_var(--glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const ghostButton =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-panel px-6 text-[15px] font-semibold text-fg no-underline transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50";
