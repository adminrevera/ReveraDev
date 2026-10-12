import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,255,61,.12),transparent_48%),linear-gradient(180deg,var(--bg2),var(--bg))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -z-10 size-[420px] -translate-x-1/2 rounded-full bg-lime/[.06] blur-[110px]"
      />

      <div className="w-full max-w-[460px]">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xl font-bold tracking-[-0.05em] text-fg no-underline"
          aria-label={`${APP_NAME}, accueil`}
        >
          <span
            className="grid size-8 place-items-center rounded-xl bg-lime text-sm text-lime-ink"
            aria-hidden="true"
          >
            R
          </span>
          {APP_NAME}
        </Link>

        <section className="rounded-[28px] border border-line bg-panel/90 p-6 shadow-[0_32px_100px_-35px_rgba(0,0,0,.9)] backdrop-blur-xl sm:p-9">
          <div className="mb-7">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-lime">
              {eyebrow}
            </p>
            <h1 className="text-[clamp(32px,8vw,42px)] leading-[1.05] font-semibold tracking-[-0.045em]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>
          </div>

          {children}

          {footer && (
            <div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
              {footer}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
