import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Eyebrow, PageHeader, ProgressBar } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { getAppSetting } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ligue · Revera" };

const getTiers = unstable_cache(
  async () => prisma.leagueTier.findMany({ orderBy: { position: "asc" }, select: { id: true, position: true, name: true } }),
  ["league-tiers"],
  { revalidate: 600, tags: ["league-tiers"] },
);

type TierRule = { position: number; up: number; down: number };

function parseRules(value: unknown): TierRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { position, up, down } = entry as Record<string, unknown>;
    return typeof position === "number" && typeof up === "number" && typeof down === "number" ? [{ position, up, down }] : [];
  });
}

function timeLeft(endsAt: Date) {
  const minutes = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days > 0 ? `${days} j ${hours} h` : `${hours} h`;
}

export default async function LeaguePage() {
  const { profile } = await requireStudentProfile();
  const [membership, tiers, rulesValue, unlockValue] = await Promise.all([
    prisma.leagueMember.findFirst({
      relationLoadStrategy: "join",
      where: { userId: profile.id, group: { week: { closedAt: null } } },
      orderBy: { group: { week: { startsOn: "desc" } } },
      select: {
        weekXp: true,
        group: {
          select: {
            week: { select: { startsOn: true } },
            tier: { select: { position: true, name: true } },
            members: {
              orderBy: [{ weekXp: "desc" }, { user: { displayName: "asc" } }],
              select: { userId: true, weekXp: true, user: { select: { displayName: true } } },
            },
          },
        },
      },
    }),
    getTiers(),
    getAppSetting("league.tierRules"),
    getAppSetting("league.unlockAfterChapters"),
  ]);

  if (!membership) {
    const unlockAfter = typeof unlockValue === "number" && unlockValue > 0 ? unlockValue : 2;
    const validated = await prisma.chapterProgress.count({ where: { userId: profile.id, completedAt: { not: null } } });
    return (
      <>
        <PageHeader eyebrow="Compétition" title="Ligue">La ligue hebdomadaire se débloque après {unlockAfter} chapitres validés.</PageHeader>
        <section className="max-w-xl rounded-2xl border border-line bg-panel p-6">
          <Eyebrow>Prochaine étape</Eyebrow>
          <h2 className="mt-3 text-xl font-semibold">La ligue t’attend</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Valide {unlockAfter} chapitres. Tu rejoindras ensuite un groupe d’étudiants et tu verras ton classement de la semaine.</p>
          <div className="mt-5 flex items-center justify-between text-xs text-muted"><span>Chapitres validés</span><span>{Math.min(validated, unlockAfter)} / {unlockAfter}</span></div>
          <ProgressBar percent={(Math.min(validated, unlockAfter) / unlockAfter) * 100} className="mt-2" />
          {tiers.length > 0 && (
            <ol className="mt-6 flex gap-1.5" aria-label="Paliers de la ligue">
              {tiers.map((tier) => <li key={tier.id} className="flex-1 truncate rounded-lg border border-line px-1 py-2 text-center text-[10px] text-muted">{tier.name}</li>)}
            </ol>
          )}
        </section>
      </>
    );
  }

  const { group } = membership;
  const members = group.members;
  const size = members.length;
  const rule = parseRules(rulesValue).find((entry) => entry.position === group.tier.position);
  // Règle validée pour un groupe de 10, proportionnelle pour les autres tailles (cahier 5.4).
  const up = rule ? Math.round((rule.up * size) / 10) : 0;
  const down = rule ? Math.round((rule.down * size) / 10) : 0;
  const myIndex = members.findIndex((member) => member.userId === profile.id);
  const myRank = myIndex + 1;
  const endsAt = new Date(group.week.startsOn.getTime() + 7 * 86_400_000);
  const gapToPromotion = up > 0 && myIndex >= up ? members[up - 1].weekXp - membership.weekXp + 1 : 0;
  const zoneOf = (index: number) => (index < up ? "up" : index >= size - down && down > 0 ? "down" : "stay");
  const zoneLabel = { up: "Montent la semaine prochaine", stay: "Restent", down: "Descendent" } as const;

  return (
    <>
      <PageHeader eyebrow="Compétition" title="Ligue">
        Semaine du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(group.week.startsOn)} · tous niveaux mélangés.
      </PageHeader>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {tiers.length > 0 && (
            <ol className="mb-5 flex gap-1.5" aria-label="Paliers de la ligue">
              {tiers.map((tier) => (
                <li key={tier.id} aria-current={tier.position === group.tier.position ? "step" : undefined} className={`flex-1 truncate rounded-lg border px-1 py-2.5 text-center text-[11px] ${tier.position === group.tier.position ? "border-accent bg-accent/[.14] font-semibold text-fg" : "border-line text-muted"}`}>
                  {tier.name}
                </li>
              ))}
            </ol>
          )}
          <ol className="grid gap-2">
            {members.map((member, index) => {
              const zone = zoneOf(index);
              const previousZone = index > 0 ? zoneOf(index - 1) : null;
              const mine = member.userId === profile.id;
              return (
                <li key={member.userId} className="grid gap-2">
                  {rule && zone !== previousZone && (
                    <p className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.14em] text-muted">
                      <span className="h-px flex-1 border-t border-dashed border-line" />{zoneLabel[zone]}<span className="h-px flex-1 border-t border-dashed border-line" />
                    </p>
                  )}
                  <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${mine ? "border-accent bg-accent/[.10]" : "border-line bg-panel"}`}>
                    <b className={`w-8 shrink-0 text-sm ${index < 3 ? "text-amber" : "text-muted"}`}>{index + 1}</b>
                    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-bg2 text-xs text-accent">{(member.user.displayName ?? "É").slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{mine ? <b>Toi</b> : member.user.displayName ?? "Étudiant"}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{member.weekXp} XP</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="grid gap-4">
          <section className="rounded-2xl border border-accent/25 bg-[linear-gradient(135deg,rgba(29,35,68,.95),rgba(17,21,43,.98))] p-5">
            <Eyebrow>Ton classement</Eyebrow>
            <p className="mt-3 text-4xl font-semibold tracking-tight">{myRank}<span className="ml-1 text-lg font-medium text-muted">/ {size}</span></p>
            <p className="mt-1 text-sm text-muted">{group.tier.name} · {membership.weekXp} XP cette semaine</p>
            {gapToPromotion > 0 && <p className="mt-3 text-sm leading-relaxed">Il te manque <b className="text-amber">{gapToPromotion} XP</b> pour entrer dans la zone de montée.</p>}
            {up > 0 && myIndex < up && membership.weekXp === 0 && <p className="mt-3 text-sm text-muted">Sans XP, tu ne montes pas : fais une séance !</p>}
          </section>
          <section className="rounded-2xl border border-line bg-panel p-5">
            <Eyebrow>Temps restant</Eyebrow>
            <p className="mt-2 text-2xl font-semibold">{timeLeft(endsAt)}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Le classement est clôturé chaque lundi. Les montées et les descentes dépendent du palier.</p>
          </section>
        </aside>
      </div>
      {!rule && <p className="mt-6 text-xs text-muted">Les zones de montée et de descente s’afficheront quand les règles de ton palier seront configurées.</p>}
    </>
  );
}
