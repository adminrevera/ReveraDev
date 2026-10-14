import type { Metadata } from "next";
import Link from "next/link";
import ProfileLevelForm from "@/components/student/ProfileLevelForm";
import { Eyebrow } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mon profil · Revera" };

const tierLabels: Record<string, string> = { FREE: "Gratuit", PLUS: "Plus", SUCCESS: "Réussite" };

export default async function ProfilePage() {
  const { profile } = await requireStudentProfile();
  const today = localCalendarDay(new Date(), profile.timezone);
  const firstDay = new Date(today.getTime() - 13 * 86_400_000);
  const [levels, badges, streakDays] = await Promise.all([
    prisma.level.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, track: { select: { name: true, institution: { select: { name: true } } } } },
    }),
    prisma.userBadge.findMany({
      relationLoadStrategy: "join",
      where: { userId: profile.id },
      orderBy: { awardedAt: "desc" },
      take: 30,
      include: { badge: { select: { name: true, description: true, category: true } } },
    }),
    prisma.streakDay.findMany({
      where: { userId: profile.id, day: { gte: firstDay, lte: today } },
      orderBy: { day: "asc" },
      select: { day: true },
    }),
  ]);
  const activeDays = new Set(streakDays.map(({ day }) => day.toISOString().slice(0, 10)));
  const lastFourteenDays = Array.from({ length: 14 }, (_, offset) => new Date(firstDay.getTime() + offset * 86_400_000));
  const initial = (profile.displayName ?? profile.email).slice(0, 1).toUpperCase();

  return (
    <>
      <header className="mb-6 flex items-center gap-4 sm:mb-8">
        <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/[.10] text-2xl font-semibold text-accent sm:size-20 sm:text-3xl">{initial}</span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{profile.displayName ?? "Étudiant"}</h1>
          <p className="mt-1 truncate text-sm text-muted">{profile.level ? `${profile.level.name} · ${profile.level.track.name} · ${profile.level.track.institution.name}` : "Niveau à renseigner"}</p>
          <p className="truncate text-xs text-muted/80">{profile.email}</p>
        </div>
      </header>

      <section aria-label="Statistiques" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-panel p-4"><p className="text-xs text-muted">Série record</p><p className="mt-2 text-2xl font-semibold">{profile.bestStreak}<span className="ml-1 text-sm font-medium text-muted">j</span></p></div>
        <div className="rounded-2xl border border-line bg-panel p-4"><p className="text-xs text-muted">XP total</p><p className="mt-2 text-2xl font-semibold">{profile.xpTotal.toLocaleString("fr-FR")}</p></div>
        <div className="rounded-2xl border border-line bg-panel p-4"><p className="text-xs text-muted">Badges</p><p className="mt-2 text-2xl font-semibold">{badges.length}</p></div>
        <div className="rounded-2xl border border-amber/20 bg-amber/[.05] p-4">
          <p className="text-xs text-muted">Offre en cours</p>
          <p className="mt-2 text-2xl font-semibold">{tierLabels[profile.tier]}</p>
          {profile.tier === "FREE" && <Link href="/#offres" className="mt-1 inline-flex text-xs font-semibold text-amber no-underline hover:underline">Passer à Plus →</Link>}
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_.8fr]">
        <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Mon parcours d’études</h2>
          <p className="mt-1 text-sm text-muted">Le niveau choisi détermine les cours et les questions affichés dans ton espace.</p>
          <ProfileLevelForm
            selectedLevelId={profile.levelId}
            levels={levels.map((level) => ({
              id: level.id,
              name: level.name,
              trackName: level.track.name,
              institutionName: level.track.institution.name,
            }))}
          />
        </section>
        <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Ma série de jours</h2>
          <p className="mt-1 text-sm text-muted">Un jour est compté lorsqu’une séance de révision est enregistrée.</p>
          <div className="mt-5 grid grid-cols-7 gap-2" aria-label="Activité des quatorze derniers jours">
            {lastFourteenDays.map((day) => {
              const active = activeDays.has(day.toISOString().slice(0, 10));
              return (
                <div key={day.toISOString()} className={`grid aspect-square place-items-center rounded-lg border text-[10px] ${active ? "border-accent/40 bg-accent/[.12] text-accent" : "border-line bg-bg2 text-muted"}`} title={new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(day)}>
                  {new Intl.DateTimeFormat("fr-FR", { weekday: "narrow", timeZone: "UTC" }).format(day)}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">{streakDays.length} jour(s) d’activité sur les 14 derniers jours.</p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <Eyebrow>Récompenses</Eyebrow>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Mes badges</h2>
        {badges.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map(({ badge, awardedAt }, index) => (
              <li key={`${badge.name}-${index}`} className="rounded-xl border border-line bg-bg2 p-4">
                <p className="font-semibold">{badge.name}</p>
                <p className="mt-1 text-sm text-muted">{badge.description ?? badge.category}</p>
                <time className="mt-2 block text-xs text-muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(awardedAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Tes badges apparaîtront après tes premières étapes de progression.</p>
        )}
      </section>
    </>
  );
}
