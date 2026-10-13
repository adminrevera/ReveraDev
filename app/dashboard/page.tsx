import type { Metadata } from "next";
import Link from "next/link";
import Lumi from "@/components/brand/Lumi";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: `Mon espace · ${APP_NAME}` };

export default async function DashboardPage() {
  const { profile } = await requireStudentProfile();
  const visibleKinds = profile.tier === "FREE" ? ["PUBLIC"] as const : ["PUBLIC", "PREMIUM"] as const;
  const itemWhere = {
    kind: "CHAPTER" as const,
    publishedVersionId: { not: null },
    visibility: { in: [...visibleKinds] },
    subject: { levelId: profile.levelId ?? "__no-level__" },
  };

  const [chapterCount, completedCount, current, activeEvent, reviewCount, badgeCount] = await Promise.all([
    profile.levelId ? prisma.contentItem.count({ where: itemWhere }) : Promise.resolve(0),
    profile.levelId ? prisma.chapterProgress.count({ where: { userId: profile.id, completedAt: { not: null }, item: itemWhere } }) : Promise.resolve(0),
    profile.levelId ? prisma.contentItem.findFirst({
      where: itemWhere,
      orderBy: [{ subject: { position: "asc" } }, { number: "asc" }],
      include: { subject: { select: { name: true } }, progress: { where: { userId: profile.id }, take: 1 } },
    }) : Promise.resolve(null),
    prisma.event.findFirst({
      where: {
        status: "ACTIVE",
        OR: [{ levelId: null }, { levelId: profile.levelId ?? "__no-level__" }],
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
        ],
      },
      orderBy: { endsAt: "asc" },
      select: { id: true, title: true, description: true, endsAt: true },
    }),
    prisma.reviewSchedule.count({ where: { userId: profile.id, dueAt: { lte: new Date() } } }),
    prisma.userBadge.count({ where: { userId: profile.id } }),
  ]);

  const questionCount = profile.levelId
    ? await prisma.question.count({
        where: {
          type: "MCQ",
          isPlaceholder: false,
          version: { status: "PUBLISHED", item: { subject: { levelId: profile.levelId }, kind: "CHAPTER" } },
        },
      })
    : 0;
  const now = new Date();
  const yearDay = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86_400_000);
  const dailyQuestion = questionCount
    ? await prisma.question.findFirst({
        where: {
          type: "MCQ",
          isPlaceholder: false,
          version: { status: "PUBLISHED", item: { subject: { levelId: profile.levelId! }, kind: "CHAPTER" } },
        },
        orderBy: { id: "asc" },
        skip: yearDay % questionCount,
        select: { text: true },
      })
    : null;

  const firstName = profile.displayName?.trim().split(/\s+/)[0] || "Étudiant";
  const levelLabel = profile.level ? `${profile.level.name} · ${profile.level.track.name} · ${profile.level.track.institution.name}` : null;
  const progressPercent = chapterCount ? Math.round((completedCount / chapterCount) * 100) : 0;

  return (
    <StudentShell role={profile.role}>
      <section className="relative isolate overflow-hidden rounded-[28px] border border-line bg-linear-to-br from-accent/[.12] via-panel to-bg2 p-6 sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-72 rounded-full bg-accent/[.08] blur-[90px]" />
        <p className="font-mono text-xs uppercase tracking-[.08em] text-amber">Ton espace Revera</p>
        <h1 className="mt-3 text-[clamp(34px,6vw,58px)] leading-[1] font-semibold tracking-[-.05em]">
          Bonjour, <span className="font-serif font-normal italic text-accent">{firstName}.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {levelLabel ? `Ton parcours : ${levelLabel}.` : "Choisis un niveau d’études dans ton profil pour voir les cours adaptés."} À toi de jouer, un chapitre après l’autre.
        </p>
        <div className="pointer-events-none absolute -right-2 -bottom-12 hidden opacity-75 sm:block">
          <Lumi mood="contente" size={112} title="Lumi t’encourage dans tes révisions" />
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Chapitres validés" value={`${completedCount} / ${chapterCount}`} detail={chapterCount ? `${progressPercent} % du parcours` : "Aucun cours publié pour ce niveau"} />
        <Stat label="Points Revera" value={profile.xpTotal.toLocaleString("fr-FR")} detail="XP gagnés dans l’application" />
        <Stat label="Série record" value={`${profile.bestStreak} j`} detail="Meilleure série enregistrée" />
        <Stat label="À revoir" value={String(reviewCount)} detail={`${badgeCount} badge${badgeCount === 1 ? "" : "s"} obtenu${badgeCount === 1 ? "" : "s"}`} />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Continuer mon parcours</p>
          {current ? (
            <>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{current.progress[0]?.completedAt ? "Parcours terminé" : current.title}</h2>
              <p className="mt-1 text-sm text-muted">{current.subject.name}{current.progress[0]?.completedAt ? " · tous les chapitres visibles sont validés" : " · chapitre à découvrir"}</p>
              <Link href="/parcours" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink no-underline transition hover:brightness-110">
                Ouvrir mes cours
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-xl font-semibold">Ton parcours commence ici</h2>
              <p className="mt-2 text-sm text-muted">Les chapitres publiés correspondant à ton niveau apparaîtront dans cette section.</p>
              <Link href="/profil" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm text-fg no-underline">Vérifier mon profil</Link>
            </>
          )}
        </article>
        <article className="rounded-2xl border border-line bg-bg2 p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Question du jour</p>
          {dailyQuestion ? (
            <>
              <h2 className="mt-3 text-lg leading-relaxed font-semibold">{dailyQuestion.text}</h2>
              <p className="mt-2 text-xs text-muted">Une question tirée des chapitres publiés de ton niveau.</p>
              <Link href="/parcours" className="mt-4 inline-flex text-sm font-semibold text-accent no-underline hover:underline">Réviser mes chapitres →</Link>
            </>
          ) : <p className="mt-3 text-sm leading-relaxed text-muted">Les questions apparaîtront dès que les cours de ton niveau seront publiés.</p>}
        </article>
      </section>

      {activeEvent && (
        <section className="mt-4 rounded-2xl border border-amber/20 bg-amber/[.05] p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Événement en cours</p>
          <h2 className="mt-2 text-xl font-semibold">{activeEvent.title}</h2>
          {activeEvent.description && <p className="mt-1 text-sm text-muted">{activeEvent.description}</p>}
        </section>
      )}
    </StudentShell>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-line bg-panel p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></article>;
}
