import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";

const sections = [
  ["overview", "Vue d’ensemble"],
  ["content", "Contenus"],
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
    <main className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line bg-bg2/90">
        <div className="mx-auto flex w-[min(1440px,calc(100%-32px))] items-center justify-between gap-4 py-4">
          <Link href="/admin" className="text-lg font-semibold tracking-tight text-fg no-underline">
            {APP_NAME}<span className="ml-2 text-xs font-mono uppercase tracking-widest text-amber">Admin</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-muted transition hover:text-fg">
            Retour à l’application
          </Link>
        </div>
      </header>
      <div className="mx-auto grid w-[min(1440px,calc(100%-32px))] gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <nav aria-label="Navigation administration" className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-5 lg:h-fit lg:flex-col lg:overflow-visible">
          {sections.map(([id, label]) => (
            <Link
              key={id}
              href={id === "overview" ? "/admin" : `/admin?section=${id}`}
              aria-current={section === id ? "page" : undefined}
              className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-sm no-underline transition lg:w-full ${
                section === id
                  ? "border-accent/40 bg-accent/[.08] font-semibold text-fg"
                  : "border-line bg-panel text-muted hover:border-accent/25 hover:text-fg"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
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
