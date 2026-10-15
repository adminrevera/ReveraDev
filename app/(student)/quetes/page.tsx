import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Eyebrow, PageHeader, ProgressBar } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { ensureDailyQuests } from "@/lib/gamification/engine";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Quêtes & événements · Revera" };

const metricLabels = { ANSWERS: "réponses", CHAPTERS: "chapitres", XP: "XP", CORRECT: "bonnes réponses", QUIZZES: "quiz", REVIEWS: "révisions", GAMES: "jeux" } as const;
const categoryLabels = {
  DISCOVERY: "Découverte",
  REGULARITY: "Régularité",
  MASTERY: "Maîtrise",
  COMPETITION: "Compétition",
  EVENT: "Événements",
} as const;

export default async function QuestsPage() {
  const { profile } = await requireStudentProfile();
  const now = new Date();
  const questDay = localCalendarDay(now, "Africa/Lome");
  await ensureDailyQuests(questDay);
  const [quests, events, badgeTotals, earnedBadges] = await Promise.all([
    prisma.dailyQuest.findMany({
      relationLoadStrategy: "join",
      where: { day: questDay, quest: { active: true } },
      include: { quest: { include: { progress: { where: { userId: profile.id, day: questDay }, take: 1 } } } },
      orderBy: { quest: { title: "asc" } },
    }),
    prisma.event.findMany({
      relationLoadStrategy: "join",
      where: {
        status: { in: ["ACTIVE", "SOON"] },
        OR: [{ levelId: null }, ...(profile.levelId ? [{ levelId: profile.levelId }] : [])],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ status: "asc" }, { endsAt: "asc" }],
      take: 20,
      include: { entries: { where: { userId: profile.id }, take: 1 } },
    }),
    prisma.badge.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.userBadge.findMany({ where: { userId: profile.id }, select: { badge: { select: { category: true } } } }),
  ]);

  // Total de la promo pour les défis d'équipe : somme des contributions de tous les participants.
  const teamIds = events.filter((event) => event.kind === "TEAM").map((event) => event.id);
  const teamTotals = teamIds.length
    ? await prisma.eventParticipation.groupBy({ by: ["eventId"], where: { eventId: { in: teamIds } }, _sum: { contribution: true } })
    : [];
  const teamTotalById = new Map(teamTotals.map((row) => [row.eventId, row._sum.contribution ?? 0]));

  const earnedByCategory = new Map<string, number>();
  for (const { badge } of earnedBadges) earnedByCategory.set(badge.category, (earnedByCategory.get(badge.category) ?? 0) + 1);
  const totalBadges = badgeTotals.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <>
      <PageHeader eyebrow="Rythme & défis" title="Quêtes">
        Trois quêtes différentes chaque jour, renouvelées à minuit. Les événements sont ouverts à tous les étudiants de ton niveau.
      </PageHeader>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">Quêtes du jour</h2>
            {quests.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {quests.map(({ quest }) => {
                  const progress = quest.progress[0];
                  const value = Math.min(progress?.value ?? 0, quest.target);
                  const percent = quest.target > 0 ? (value / quest.target) * 100 : 0;
                  return (
                    <article key={quest.id} className="rounded-2xl border border-line bg-panel p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-snug">{quest.title}</h3>
                        <span className="shrink-0 rounded-full border border-amber/25 bg-amber/[.07] px-2.5 py-0.5 text-xs font-medium text-amber">+{quest.rewardXp} XP</span>
                      </div>
                      <p className="mt-2 text-sm text-muted">{value} / {quest.target} {metricLabels[quest.metric]}</p>
                      <ProgressBar percent={percent} className="mt-3" />
                      {progress?.completedAt && <p className="mt-2 text-xs font-medium text-accent">Quête terminée</p>}
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Pas de quête aujourd’hui">Aucune quête n’a été programmée pour aujourd’hui.</EmptyState>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">Événements</h2>
            {events.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {events.map((event) => {
                  const own = event.entries[0]?.contribution ?? 0;
                  const team = event.kind === "TEAM";
                  const current = team ? teamTotalById.get(event.id) ?? 0 : own;
                  const percent = event.goal ? (Math.min(current, event.goal) / event.goal) * 100 : 0;
                  const active = event.status === "ACTIVE";
                  return (
                    <article key={event.id} className={`rounded-2xl border p-5 ${active ? "border-amber/25 bg-amber/[.04]" : "border-dashed border-line bg-panel/60"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Eyebrow>{team ? "Défi en équipe" : "Défi solo"}</Eyebrow>
                          <h3 className="mt-1.5 font-semibold leading-snug">{event.title}</h3>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${active ? "border-amber/30 text-amber" : "border-line text-muted"}`}>{active ? "En cours" : "Bientôt"}</span>
                      </div>
                      {event.description && <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>}
                      {event.goal ? (
                        <>
                          <ProgressBar percent={percent} className="mt-4" />
                          <p className="mt-2 text-xs text-muted">{current.toLocaleString("fr-FR")} / {event.goal.toLocaleString("fr-FR")} {event.unit ?? ""}{team ? ` · ta contribution : ${own}` : ""}</p>
                        </>
                      ) : own ? <p className="mt-3 text-xs text-muted">Ta contribution : {own}</p> : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Aucun événement ouvert">Aucun événement n’est ouvert pour ton profil.</EmptyState>
            )}
          </section>
        </div>

        <aside className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Badges</h2>
            <span className="text-sm text-muted">{earnedBadges.length} sur {totalBadges}</span>
          </div>
          <ul className="mt-4 grid gap-2">
            {badgeTotals
              .slice()
              .sort((a, b) => Object.keys(categoryLabels).indexOf(a.category) - Object.keys(categoryLabels).indexOf(b.category))
              .map((row) => (
                <li key={row.category} className="flex items-center justify-between rounded-xl border border-line bg-bg2 px-3.5 py-2.5 text-sm">
                  <span>{categoryLabels[row.category]}</span>
                  <span className="text-muted">{earnedByCategory.get(row.category) ?? 0} / {row._count._all}</span>
                </li>
              ))}
          </ul>
          <Link href="/badges" className="mt-4 inline-flex text-sm font-semibold text-accent no-underline hover:underline">Voir tous mes badges →</Link>
        </aside>
      </div>
    </>
  );
}
