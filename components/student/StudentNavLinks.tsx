"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Accueil", icon: "home" },
  { href: "/parcours", label: "Parcours", icon: "path" },
  { href: "/entrainement", label: "Entraînement", icon: "target" },
  { href: "/ligue", label: "Ligue", icon: "trophy" },
  { href: "/quetes", label: "Quêtes", icon: "spark" },
  { href: "/reviser", label: "Réviser", icon: "refresh" },
  { href: "/profil", label: "Profil", icon: "user" },
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/parcours") return pathname.startsWith("/parcours") || pathname.startsWith("/quiz");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  const shared = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const shapes = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    path: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h4a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m15 9 5-5M17 4h3v3" /></>,
    trophy: <><path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0zM7 7H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 9a7 7 0 0 1 12-2l2 2M4 15l2 2a7 7 0 0 0 12-2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };

  return <svg {...shared}>{shapes[name]}</svg>;
}

export default function StudentNavLinks({ layout }: { layout: "sidebar" | "mobile" }) {
  const pathname = usePathname();
  const mobile = layout === "mobile";

  if (mobile) {
    const primaryLinks = links.slice(0, 4);
    const moreLinks = links.slice(4);
    const moreIsCurrent = moreLinks.some(({ href }) => isCurrent(pathname, href));

    return (
      <nav
        aria-label="Navigation étudiante"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,.18)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {primaryLinks.map(({ href, label, icon }) => {
            const current = isCurrent(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-[68px] flex-col items-center justify-center gap-1 px-1 text-[11px] no-underline transition ${
                  current ? "bg-accent/[.10] font-semibold text-fg" : "text-muted hover:text-fg"
                }`}
              >
                <span className={current ? "text-accent" : "text-muted"}><NavIcon name={icon} /></span>
                <span className="truncate">{label === "Entraînement" ? "Entraîn." : label}</span>
              </Link>
            );
          })}
          <details className="group relative">
            <summary
              aria-current={moreIsCurrent ? "page" : undefined}
              className={`flex min-h-[68px] cursor-pointer list-none flex-col items-center justify-center gap-1 px-1 text-[11px] transition marker:hidden [&::-webkit-details-marker]:hidden ${
                moreIsCurrent ? "bg-accent/[.10] font-semibold text-fg" : "text-muted hover:text-fg"
              }`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
              </svg>
              <span>Plus</span>
            </summary>
            <div className="absolute bottom-[calc(100%+12px)] right-0 w-[min(22rem,calc(100vw-1rem))] rounded-2xl border border-line bg-bg p-3 shadow-[0_16px_48px_rgba(0,0,0,.4)]">
              <div className="grid gap-2">
                {moreLinks.map(({ href, label, icon }) => {
                  const current = isCurrent(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={`flex min-h-14 items-center gap-3 rounded-xl border px-3.5 text-sm no-underline ${
                        current ? "border-accent/30 bg-accent/[.10] font-semibold text-fg" : "border-line text-fg"
                      }`}
                    >
                      <span className="text-accent"><NavIcon name={icon} /></span>
                      <span>{label}</span>
                      <span className="ml-auto text-muted" aria-hidden="true">›</span>
                    </Link>
                  );
                })}
                <Link
                  href="/#offres"
                  className="rounded-xl border border-dashed border-line px-3.5 py-3 text-fg no-underline"
                >
                  <span className="block text-sm font-semibold">Passe à Plus</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">Entraînement sans limite et révision espacée.</span>
                </Link>
              </div>
            </div>
          </details>
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navigation étudiante"
      className="grid gap-1"
    >
      {links.map(({ href, label, icon }, index) => {
        const current = isCurrent(pathname, href);
        const groupTitle = index === 4;
        return (
          <div key={href}>
            {groupTitle && <p className="mb-2 mt-5 px-3 font-mono text-[10px] uppercase tracking-[.18em] text-muted/75">Ta progression</p>}
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-sm no-underline transition ${
                current
                  ? "border border-accent/25 bg-accent/[.10] font-semibold text-fg shadow-[inset_3px_0_0_var(--accent)]"
                  : "border border-transparent text-muted hover:border-line hover:bg-white/[.035] hover:text-fg"
              }`}
            >
              <span className={`transition ${current ? "text-accent" : "text-muted group-hover:text-fg"}`}><NavIcon name={icon} /></span>
              <span>{label}</span>
              {href === "/reviser" && !mobile && <span className="ml-auto size-1.5 rounded-full bg-amber/80" aria-label="Révisions disponibles" />}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
