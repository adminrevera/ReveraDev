import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";

const sections = [
  ["overview", "Vue d’ensemble"],
  ["review", "Relecture"],
  ["studio", "Studio"],
  ["gamification", "Gamification"],
  ["assistant", "Assistant IA"],
  ["students", "Étudiants"],
  ["payments", "Paiements"],
  ["operations", "Animation"],
  ["settings", "Offres & réglages"],
  ["audit", "Journal d’audit"],
] as const;

export default function AdminShell({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-fg lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-r border-line bg-bg2/70 px-4 py-6 lg:flex">
        <Link href="/admin" className="mb-2 px-3 text-lg font-semibold tracking-tight text-fg no-underline">
          {APP_NAME}<span className="ml-2 font-mono text-[10px] uppercase tracking-[.16em] text-amber">Admin</span>
        </Link>
        <p className="mb-8 px-3 text-xs text-muted">Pilotage de Revera</p>
        <nav aria-label="Navigation administration" className="grid gap-1">
          {sections.map(([id, label]) => (
            <Link
              key={id}
              href={id === "overview" ? "/admin" : `/admin?section=${id}`}
              aria-current={section === id ? "page" : undefined}
              className={`rounded-xl border px-3.5 py-3 text-sm no-underline transition ${
                section === id
                  ? "border-accent/25 bg-accent/[.10] font-semibold text-fg shadow-[inset_3px_0_0_var(--accent)]"
                  : "border-transparent text-muted hover:border-line hover:bg-white/[.035] hover:text-fg"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="mt-auto rounded-xl border border-line px-3.5 py-3 text-sm text-muted no-underline transition hover:text-fg">
          ← Retour à l’application
        </Link>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-line bg-bg2/80 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="text-base font-semibold tracking-tight text-fg no-underline">
              {APP_NAME}<span className="ml-2 font-mono text-[10px] uppercase tracking-[.16em] text-amber">Admin</span>
            </Link>
            <Link href="/dashboard" className="text-xs text-muted no-underline hover:text-fg">Application ↗</Link>
          </div>
        </header>
        <div className="border-b border-line bg-bg2/45 px-3 lg:hidden">
          <nav aria-label="Navigation administration" className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map(([id, label]) => (
              <Link
                key={id}
                href={id === "overview" ? "/admin" : `/admin?section=${id}`}
                aria-current={section === id ? "page" : undefined}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs no-underline transition ${
                  section === id ? "border-accent/30 bg-accent/[.1] font-semibold text-fg" : "border-transparent text-muted hover:bg-white/[.04] hover:text-fg"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-7">
      <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}

export function AdminPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const adminInput =
  "min-h-11 w-full rounded-xl border border-line bg-[#111611] px-3.5 text-sm text-fg outline-none placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/10";
export const adminButton =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-accent/50 bg-accent/[.08] px-4 text-sm font-semibold text-fg transition hover:bg-accent/[.15]";
