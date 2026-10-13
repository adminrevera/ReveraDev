import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import SignOutButton from "@/components/auth/SignOutButton";
import Logo from "@/components/brand/Logo";
import { APP_NAME } from "@/lib/config";

const links = [
  ["/dashboard", "Accueil"],
  ["/parcours", "Parcours"],
  ["/entrainement", "Entraînement"],
  ["/ligue", "Ligue"],
  ["/quetes", "Quêtes"],
  ["/reviser", "Réviser"],
  ["/profil", "Profil"],
];

export default function StudentShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-line bg-bg2/90">
        <div className="mx-auto flex w-[min(1200px,calc(100%-32px))] items-center justify-between gap-4 py-4">
          <Link href="/dashboard" className="min-w-0 text-fg no-underline" aria-label={`${APP_NAME}, espace étudiant`}>
            <Logo height={32} />
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            {role === "ADMIN" && <Link href="/admin" className="text-sm text-amber no-underline hover:text-fg">Administration</Link>}
            <SignOutButton />
          </div>
        </div>
      </header>
      <nav aria-label="Navigation étudiante" className="border-b border-line bg-bg2/50">
        <div className="mx-auto flex w-[min(1200px,calc(100%-32px))] gap-1 overflow-x-auto py-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-full px-3.5 py-2 text-sm text-muted no-underline transition hover:bg-panel hover:text-fg">
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="mx-auto w-[min(1200px,calc(100%-32px))] py-7 sm:py-10">{children}</div>
    </main>
  );
}
