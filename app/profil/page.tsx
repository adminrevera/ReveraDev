import type { Metadata } from "next";
import StudentShell from "@/components/student/StudentShell";
import ProfileLevelForm from "@/components/student/ProfileLevelForm";
import { requireStudentProfile } from "@/lib/auth/access";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mon profil · Revera" };

const tierLabels: Record<string, string> = { FREE: "Gratuit", PLUS: "Plus", SUCCESS: "Réussite" };

export default async function ProfilePage() {
  const { user, profile } = await requireStudentProfile();
  const today = localCalendarDay(new Date(), profile.timezone);
  const firstDay = new Date(today.getTime() - 13 * 86_400_000);
  const [levels, badges, streakDays] = await Promise.all([
    prisma.level.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, track: { select: { name: true, institution: { select: { name: true } } } } },
    }),
    prisma.userBadge.findMany({
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
  const lastFourteenDays = Array.from({ length: 14 }, (_, offset) => {
    return new Date(firstDay.getTime() + offset * 86_400_000);
  });

  return (
    <StudentShell role={profile.role}>
      <header className="mb-7">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Compte étudiant</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Mon profil</h1>
        <p className="mt-2 text-sm text-muted">Tes informations et ta progression personnelle.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
        <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold">{profile.displayName ?? "Étudiant"}</h2>
          <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
          <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted">Offre</p><p className="mt-1 font-semibold">{tierLabels[profile.tier]}</p></div>
            <div><p className="text-xs text-muted">XP total</p><p className="mt-1 font-semibold">{profile.xpTotal.toLocaleString("fr-FR")}</p></div>
            <div><p className="text-xs text-muted">Série record</p><p className="mt-1 font-semibold">{profile.bestStreak} jour{profile.bestStreak === 1 ? "" : "s"}</p></div>
          </div>
          <h3 className="mt-6 font-semibold">Mon parcours d’études</h3>
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
          <h2 className="text-xl font-semibold">Ma série de jours</h2>
          <p className="mt-1 text-sm text-muted">Un jour est compté lorsqu’une séance de révision est enregistrée.</p>
          <div className="mt-5 grid grid-cols-7 gap-2" aria-label="Activité des quatorze derniers jours">
            {lastFourteenDays.map((day) => {
              const active = activeDays.has(day.toISOString().slice(0, 10));
              return <div key={day.toISOString()} className={`grid aspect-square place-items-center rounded-lg border text-[10px] ${active ? "border-accent/40 bg-accent/[.12] text-accent" : "border-line bg-bg2 text-muted"}`} title={new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(day)}>
                {new Intl.DateTimeFormat("fr-FR", { weekday: "narrow", timeZone: "UTC" }).format(day)}
              </div>;
            })}
          </div>
          <p className="mt-3 text-xs text-muted">{streakDays.length} jour(s) d’activité enregistrés sur les 14 derniers jours.</p>
        </section>
      </div>
      <section className="mt-4 rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Mes badges</h2>
        {badges.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{badges.map(({ badge, awardedAt }, index) => <li key={`${badge.name}-${index}`} className="rounded-xl border border-line bg-bg2 p-4">
          <p className="font-semibold">{badge.name}</p><p className="mt-1 text-sm text-muted">{badge.description ?? badge.category}</p>
          <time className="mt-2 block text-xs text-muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(awardedAt)}</time>
        </li>)}</ul> : <p className="mt-3 text-sm text-muted">Tes badges apparaîtront après tes premières étapes de progression.</p>}
      </section>
    </StudentShell>
  );
}
