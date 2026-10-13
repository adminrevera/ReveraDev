import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";
import Logo from "@/components/brand/Logo";

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
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
      <div
        aria-hidden="true"
        className="halo pointer-events-none absolute inset-0 -z-10 opacity-75"
      />

      <div className="w-full max-w-[460px]">
        <Link
          href="/"
          className="mb-5 inline-flex max-w-full items-center text-fg no-underline sm:mb-7"
          aria-label={`${APP_NAME}, accueil`}
        >
          <Logo height={34} />
        </Link>

        <section className="rounded-[28px] border border-line bg-panel/90 p-5 shadow-[0_32px_100px_-35px_rgba(0,0,0,.9)] backdrop-blur-xl sm:p-9">
          <div className="mb-7">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-amber">
              {eyebrow}
            </p>
            <h1 className="text-[clamp(32px,8vw,42px)] leading-[1.05] font-semibold tracking-[-0.045em] [overflow-wrap:anywhere]">
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
