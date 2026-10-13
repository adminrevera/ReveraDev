import type { Metadata } from "next";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Quêtes & événements · Revera" };

export default async function QuestsPage() {
  const { profile } = await requireStudentProfile();
  const now = new Date();
  const day = localCalendarDay(now, profile.timezone);
  const questDay = localCalendarDay(now, "Africa/Lome");
  const [quests, events] = await Promise.all([
    prisma.dailyQuest.findMany({
      where: { day: questDay, quest: { active: true } },
      include: { quest: { include: { progress: { where: { userId: profile.id, day }, take: 1 } } } },
      orderBy: { quest: { title: "asc" } },
    }),
    prisma.event.findMany({
      where: {
        status: { in: ["ACTIVE", "SOON"] },
        OR: [{ levelId: null }, ...(profile.levelId ? [{ levelId: profile.levelId }] : [])],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ status: "asc" }, { endsAt: "asc" }],
      take: 20,
      include: { entries: { where: { userId: profile.id }, take: 1 } },
    }),
  ]);

  return (
    <StudentShell role={profile.role}>
      <header className="mb-7">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Rythme & défis</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quêtes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Les quêtes programmées et les événements actifs de ton niveau apparaîtront ici.</p>
      </header>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Aujourd’hui</h2>
        {quests.length ? <div className="grid gap-3 md:grid-cols-2">{quests.map(({ quest }) => {
          const progress = quest.progress[0];
          const value = Math.min(progress?.value ?? 0, quest.target);
          const percent = Math.round((value / quest.target) * 100);
          return <article key={quest.id} className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{quest.title}</h3><span className="shrink-0 text-xs text-amber">+{quest.rewardXp} XP</span></div>
            <p className="mt-2 text-sm text-muted">{value} / {quest.target} {quest.metric === "ANSWERS" ? "réponses" : quest.metric === "CHAPTERS" ? "chapitres" : "XP"}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg2"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} /></div>
            {progress?.completedAt && <p className="mt-2 text-xs text-accent">Quête terminée</p>}
          </article>;
        })}</div> : <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-muted">Aucune quête n’a été programmée pour aujourd’hui.</p>}
      </section>
      <section className="mt-7">
        <h2 className="mb-3 text-xl font-semibold">Événements</h2>
        {events.length ? <div className="grid gap-3 md:grid-cols-2">{events.map((event) => {
          const entry = event.entries[0];
          return <article key={event.id} className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex justify-between gap-3"><h3 className="font-semibold">{event.title}</h3><span className="text-xs text-amber">{event.status === "ACTIVE" ? "En cours" : "À venir"}</span></div>
            {event.description && <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>}
            <p className="mt-3 text-xs text-muted">{event.kind === "TEAM" ? "Défi d’équipe" : "Défi solo"}{event.goal ? ` · objectif ${event.goal} ${event.unit ?? ""}` : ""}{entry ? ` · ta contribution : ${entry.contribution}` : ""}</p>
          </article>;
        })}</div> : <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-muted">Aucun événement n’est ouvert pour ton profil.</p>}
      </section>
    </StudentShell>
  );
}
