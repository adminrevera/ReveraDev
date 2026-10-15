import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import LumiCompanion from "@/components/brand/LumiCompanion";
import { requireStudentProfile } from "@/lib/auth/access";
import { ensureDailyQuests } from "@/lib/gamification/engine";
import { localCalendarDay } from "@/lib/local-day";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/config";
import { measureServerOperation } from "@/lib/server-performance";
import { getStudentCatalog } from "@/lib/student/catalog";

export const metadata: Metadata = { title: `Mon espace · ${APP_NAME}` };

const dayMs = 86_400_000;

export default async function DashboardPage() {
  const { profile } = await requireStudentProfile();
  return (
    <Suspense fallback={<DashboardLoading profile={profile} />}>
      <DashboardContent profile={profile} />
    </Suspense>
  );
}

type DashboardProfile = Awaited<ReturnType<typeof requireStudentProfile>>["profile"];

function DashboardLoading({ profile }: { profile: DashboardProfile }) {
  const firstName = profile.displayName?.trim().split(/\s+/)[0] || "Étudiant";
  const levelLabel = profile.level ? `${profile.level.name} · ${profile.level.track.name} · ${profile.level.track.institution.name}` : null;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]" aria-busy="true">
      <div className="min-w-0">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">Ton espace Revera</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
              Bonjour, <span className="font-serif font-normal italic text-accent">{firstName}.</span>
            </h1>
            <p className="mt-2 text-sm text-muted">{levelLabel ? `Ton parcours : ${levelLabel}.` : "Choisis ton niveau dans le profil pour découvrir tes cours."}</p>
          </div>
          <Link href="/parcours" className="inline-flex min-h-10 items-center rounded-full border border-line bg-panel px-4 text-sm text-fg no-underline">Voir mon parcours</Link>
        </header>
        <div className="grid gap-4" aria-hidden="true">
          <div className="h-56 animate-pulse rounded-[24px] border border-line bg-panel" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-44 animate-pulse rounded-2xl border border-line bg-panel" />
            <div className="h-44 animate-pulse rounded-2xl border border-line bg-panel" />
          </div>
        </div>
      </div>
      <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1" aria-hidden="true">
        <div className="h-48 animate-pulse rounded-2xl border border-line bg-panel" />
        <div className="h-48 animate-pulse rounded-2xl border border-line bg-panel" />
        <div className="h-28 animate-pulse rounded-2xl border border-line bg-panel" />
      </aside>
    </div>
  );
}

async function DashboardContent({ profile }: { profile: DashboardProfile }) {
  const now = new Date();
  const today = localCalendarDay(now, profile.timezone);
  const questDay = localCalendarDay(now, "Africa/Lome");
  const yearDay = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / dayMs);
  const [catalog, progressRows, activeEvent, reviewCount, badgeCount, streakDays, firstQuests, membership] = await measureServerOperation("dashboard.prismaQueries", () => Promise.all([
    profile.levelId ? getStudentCatalog(profile.levelId, profile.tier) : Promise.resolve(null),
    prisma.chapterProgress.findMany({
      where: { userId: profile.id },
      select: { itemId: true, completedAt: true },
    }),
    prisma.event.findFirst({
      where: {
        status: "ACTIVE",
        OR: [{ levelId: null }, ...(profile.levelId ? [{ levelId: profile.levelId }] : [])],
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { endsAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        endsAt: true,
        entries: { where: { userId: profile.id }, take: 1, select: { contribution: true } },
      },
    }),
    prisma.reviewSchedule.count({ where: { userId: profile.id, dueAt: { lte: now } } }),
    prisma.userBadge.count({ where: { userId: profile.id } }),
    prisma.streakDay.findMany({
      where: { userId: profile.id, day: { lte: today, gte: new Date(today.getTime() - 366 * dayMs) } },
      orderBy: { day: "desc" },
      take: 367,
      select: { day: true },
    }),
    prisma.dailyQuest.findMany({
      relationLoadStrategy: "join",
      where: { day: questDay, quest: { active: true } },
      include: { quest: { include: { progress: { where: { userId: profile.id, day: questDay }, take: 1 } } } },
      orderBy: { quest: { title: "asc" } },
      take: 3,
    }),
    prisma.leagueMember.findFirst({
      where: { userId: profile.id, group: { week: { closedAt: null } } },
      orderBy: { group: { week: { startsOn: "desc" } } },
      select: { weekXp: true, group: { select: { tier: { select: { name: true } } } } },
    }),
  ]));

  // Première visite du jour : on tire les quêtes du jour dans la réserve, puis on relit.
  let dailyQuests = firstQuests;
  if (!firstQuests.length) {
    await ensureDailyQuests(questDay);
    dailyQuests = await prisma.dailyQuest.findMany({
      relationLoadStrategy: "join",
      where: { day: questDay, quest: { active: true } },
      include: { quest: { include: { progress: { where: { userId: profile.id, day: questDay }, take: 1 } } } },
      orderBy: { quest: { title: "asc" } },
      take: 3,
    });
  }

  const dailyQuestions = catalog?.questions ?? [];
  const dailyQuestion = dailyQuestions.length ? dailyQuestions[yearDay % dailyQuestions.length] : null;
  const progressByItem = new Map(progressRows.map(({ itemId, completedAt }) => [itemId, completedAt]));
  const availableChapters = [...(catalog?.subjects ?? [])]
    .sort((left, right) => left.position - right.position)
    .flatMap((subject) =>
    subject.items.map((item) => ({
      ...item,
      subject: { name: subject.name },
      progress: [{ completedAt: progressByItem.get(item.id) ?? null }],
    })),
  );
  const chapterCount = availableChapters.length;
  const completedCount = availableChapters.filter(({ progress }) => !!progress[0]?.completedAt).length;
  const current = availableChapters.find(({ progress }) => !progress[0]?.completedAt) ?? null;
  const firstName = profile.displayName?.trim().split(/\s+/)[0] || "Étudiant";
  const levelLabel = profile.level ? `${profile.level.name} · ${profile.level.track.name} · ${profile.level.track.institution.name}` : null;
  const progressPercent = chapterCount ? Math.round((completedCount / chapterCount) * 100) : 0;
  const activeDays = new Set(streakDays.map(({ day }) => day.toISOString().slice(0, 10)));
  let streakStart = today.getTime();
  if (!activeDays.has(today.toISOString().slice(0, 10))) streakStart -= dayMs;
  let currentStreak = 0;
  while (activeDays.has(new Date(streakStart).toISOString().slice(0, 10))) {
    currentStreak++;
    streakStart -= dayMs;
  }
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => new Date(today.getTime() - (6 - index) * dayMs));
  const lumiMood = activeEvent ? "contente" : reviewCount || dailyQuests.some(({ quest }) => !quest.progress[0]?.completedAt) ? "studieuse" : "base";
  const lumiMessage = activeEvent
    ? `L’événement « ${activeEvent.title} » est lancé. Chaque étape compte !`
    : reviewCount
      ? `${reviewCount} révision${reviewCount > 1 ? "s" : ""} t’attend${reviewCount > 1 ? "ent" : ""}. Une petite session suffit pour avancer.`
      : currentStreak
        ? `Ta série de ${currentStreak} jour${currentStreak > 1 ? "s" : ""} est lancée. On continue ?`
        : "Une première séance aujourd’hui et on décolle ensemble.";

  return (
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">Ton espace Revera</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
                Bonjour, <span className="font-serif font-normal italic text-accent">{firstName}.</span>
              </h1>
              <p className="mt-2 text-sm text-muted">{levelLabel ? `Ton parcours : ${levelLabel}.` : "Choisis ton niveau dans le profil pour découvrir tes cours."}</p>
            </div>
            <Link href="/parcours" className="inline-flex min-h-10 items-center rounded-full border border-line bg-panel px-4 text-sm text-fg no-underline transition hover:border-accent/35">
              Voir mon parcours <span aria-hidden="true" className="ml-2 text-accent">↗</span>
            </Link>
          </header>

          <section className="relative isolate overflow-hidden rounded-[24px] border border-accent/20 bg-[radial-gradient(ellipse_at_85%_5%,rgba(170,181,255,.14),transparent_48%),linear-gradient(135deg,rgba(29,35,68,.95),rgba(17,21,43,.98))] p-5 sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-64 rounded-full bg-accent/[.08] blur-[80px]" />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Reprendre là où tu en étais</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {current ? current.title : chapterCount ? "Ton parcours est à jour" : "Ton parcours commence ici"}
                </h2>
                {current && <p className="mt-1 text-sm text-muted">{current.subject.name}</p>}
              </div>
              <span className="rounded-xl border border-accent/20 bg-accent/[.08] px-3 py-2 text-xs font-medium text-accent">
                {completedCount} / {chapterCount} chapitres
              </span>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs text-muted"><span>Progression générale</span><span>{progressPercent} %</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--amber))] transition-[width]" style={{ width: `${progressPercent}%` }} /></div>
            </div>
            <Link
              href={current ? `/parcours/${current.id}` : "/parcours"}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink no-underline transition hover:brightness-110"
            >
              {current ? "Continuer le chapitre" : chapterCount ? "Revoir mes cours" : "Explorer les cours"}
            </Link>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <article className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Question du jour</p>
                <span className="rounded-full border border-line px-2.5 py-1 text-[10px] text-muted">MCQ</span>
              </div>
              {dailyQuestion ? (
                <>
                  <h2 className="mt-4 text-lg font-semibold leading-relaxed">{dailyQuestion.text}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted">Une question issue des chapitres publiés pour ton niveau.</p>
                  <Link href="/entrainement" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-accent/30 px-4 text-sm font-medium text-accent no-underline transition hover:bg-accent/[.08]">
                    M’entraîner <span aria-hidden="true" className="ml-2">→</span>
                  </Link>
                </>
              ) : <p className="mt-4 text-sm leading-relaxed text-muted">Les questions apparaîtront dès que les cours de ton niveau seront publiés.</p>}
            </article>
            <article className="rounded-2xl border border-line bg-bg2/75 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Quêtes du jour</p>
                <Link href="/quetes" className="text-xs text-accent no-underline hover:underline">Tout voir →</Link>
              </div>
              {dailyQuests.length ? <ul className="mt-3 space-y-3">
                {dailyQuests.map(({ quest }) => {
                  const progress = quest.progress[0];
                  const value = Math.min(progress?.value ?? 0, quest.target);
                  const percent = quest.target > 0 ? Math.round((value / quest.target) * 100) : 0;
                  return <li key={quest.id}>
                    <div className="flex justify-between gap-2 text-xs"><span className="font-medium">{quest.title}</span><span className="shrink-0 text-muted">{value}/{quest.target}</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} /></div>
                  </li>;
                })}
              </ul> : <p className="mt-4 text-sm leading-relaxed text-muted">Aucune quête n’a été programmée pour aujourd’hui.</p>}
            </article>
          </section>

          {activeEvent && (
            <section className="mt-4 rounded-2xl border border-amber/20 bg-amber/[.05] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Événement en cours</p>
                  <h2 className="mt-2 text-xl font-semibold">{activeEvent.title}</h2>
                  {activeEvent.description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{activeEvent.description}</p>}
                </div>
                <span className="rounded-full border border-amber/20 px-3 py-1.5 text-xs text-amber">
                  {activeEvent.entries[0] ? `${activeEvent.entries[0].contribution} contribution(s)` : "À découvrir"}
                </span>
              </div>
              <Link href="/quetes" className="mt-4 inline-flex text-sm font-semibold text-amber no-underline hover:underline">Voir l’événement →</Link>
            </section>
          )}
        </div>

        <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <LumiCompanion
            context={activeEvent ? "Événement en cours" : reviewCount ? "Révisions à faire" : "Prêt·e à avancer"}
            message={lumiMessage}
            initialMood={lumiMood}
          />

          <section className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Ta série</p>
                <p className="mt-2 text-3xl font-semibold">{currentStreak}<span className="ml-1 text-sm font-medium text-muted">jour{currentStreak === 1 ? "" : "s"}</span></p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl border border-amber/20 bg-amber/[.07] text-lg text-amber" aria-hidden="true">✦</span>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Activité des sept derniers jours">
              {lastSevenDays.map((day) => {
                const key = day.toISOString().slice(0, 10);
                const active = activeDays.has(key);
                return <div key={key} title={new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(day)} className={`grid aspect-square place-items-center rounded-lg border text-[10px] ${active ? "border-accent/35 bg-accent/[.12] text-accent" : "border-line bg-bg2 text-muted"}`}>
                  {new Intl.DateTimeFormat("fr-FR", { weekday: "narrow", timeZone: "UTC" }).format(day)}
                </div>;
              })}
            </div>
            <p className="mt-3 text-xs text-muted">Record personnel : {profile.bestStreak} jours</p>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-xs text-muted">Points Revera</p>
              <p className="mt-2 text-2xl font-semibold">{profile.xpTotal.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-[11px] text-muted">XP gagnés</p>
            </article>
            <article className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-xs text-muted">À réviser</p>
              <p className="mt-2 text-2xl font-semibold">{reviewCount}</p>
              <p className="mt-1 text-[11px] text-muted">{badgeCount} badge{badgeCount === 1 ? "" : "s"}</p>
            </article>
          </section>

          <Link href="/ligue" className="group rounded-2xl border border-line bg-[radial-gradient(ellipse_at_95%_5%,rgba(255,210,122,.1),transparent_54%),var(--panel)] p-5 text-fg no-underline transition hover:border-amber/30">
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">La ligue</p>
            <h2 className="mt-2 text-lg font-semibold">{membership ? membership.group.tier.name : completedCount >= 2 ? "Ta place t’attend" : "À débloquer"}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{membership ? `${membership.weekXp} XP cette semaine` : "Valide deux chapitres pour rejoindre le classement hebdomadaire."}</p>
            <span className="mt-3 inline-flex text-xs font-semibold text-accent group-hover:underline">Voir la ligue →</span>
          </Link>
        </aside>
      </div>
  );
}
