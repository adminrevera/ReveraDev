import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import SignOutButton from "@/components/auth/SignOutButton";
import Logo from "@/components/brand/Logo";
import Link from "next/link";
import StudentNavLinks from "@/components/student/StudentNavLinks";

export default function StudentShell({
  role,
  xp,
  children,
}: {
  role: Role;
  xp?: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-r border-line bg-bg2/70 px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-9 flex items-center px-2 text-fg no-underline" aria-label="Revera, espace étudiant">
          <Logo height={35} />
        </Link>
        <StudentNavLinks layout="sidebar" />
        <div className="mt-auto space-y-4 pt-8">
          <Link href="/abonnement" className="block rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,rgba(170,181,255,.1),rgba(255,210,122,.05))] p-4 text-fg no-underline transition hover:border-accent/40">
            <span className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Pour aller plus loin</span>
            <span className="mt-2 block text-sm font-semibold">Découvre les offres</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">Trouve la formule adaptée à ta façon de réviser.</span>
            <span className="mt-3 inline-flex text-xs font-semibold text-accent">En savoir plus <span aria-hidden="true" className="ml-1">↗</span></span>
          </Link>
          {role === "ADMIN" && <Link href="/admin" className="rounded-xl px-3 py-2 text-sm text-amber no-underline transition hover:bg-white/[.04]">Ouvrir l’administration</Link>}
          <div className="flex items-center justify-between border-t border-line pt-4">
            <Link href="/profil" className="text-xs text-muted no-underline transition hover:text-fg">Mon profil</Link>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-line bg-bg2/80 lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/dashboard" className="text-fg no-underline" aria-label="Revera, espace étudiant"><Logo height={30} /></Link>
            <div className="flex items-center gap-3">
              {typeof xp === "number" && (
                <Link href="/profil" className="rounded-full border border-amber/25 bg-amber/[.07] px-3 py-1 text-xs font-semibold text-amber no-underline" aria-label={`${xp} points d’expérience`}>
                  ✦ {xp.toLocaleString("fr-FR")} XP
                </Link>
              )}
              {role === "ADMIN" && <Link href="/admin" className="text-xs text-amber no-underline">Administration</Link>}
              <SignOutButton />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </div>
      <StudentNavLinks layout="mobile" />
    </div>
  );
}
