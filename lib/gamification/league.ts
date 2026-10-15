import { getAppSetting } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

const GROUP_SIZE = 10;

export function mondayOf(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day;
}

export async function leagueUnlockThreshold() {
  const value = await getAppSetting("league.unlockAfterChapters");
  return typeof value === "number" && value > 0 ? Math.floor(value) : 2;
}

/**
 * Ouvre la ligue d'un étudiant dès qu'il a validé assez de chapitres, TOUS COURS CONFONDUS (réglage « league.unlockAfterChapters », 2 par défaut).
 * Retourne true si l'étudiant est (ou vient d'être mis) dans un groupe de la semaine en cours.
 */
export async function ensureLeagueMembership(userId: string, now = new Date()) {
  const existing = await prisma.leagueMember.findFirst({
    where: { userId, group: { week: { closedAt: null } } },
    select: { groupId: true },
  });
  if (existing) return true;

  const [threshold, validated] = await Promise.all([
    leagueUnlockThreshold(),
    prisma.chapterProgress.count({ where: { userId, completedAt: { not: null } } }),
  ]);
  if (validated < threshold) return false;

  const startsOn = mondayOf(now);
  const week = await prisma.leagueWeek.upsert({ where: { startsOn }, create: { startsOn }, update: {}, select: { id: true, closedAt: true } });
  if (week.closedAt) return false;

  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { leagueTierId: true } });
  const tier = profile?.leagueTierId
    ? { id: profile.leagueTierId }
    : await prisma.leagueTier.findFirst({ orderBy: { position: "asc" }, select: { id: true } });
  if (!tier) return false;

  const groups = await prisma.leagueGroup.findMany({
    where: { weekId: week.id, tierId: tier.id },
    select: { id: true, _count: { select: { members: true } } },
  });
  const group = groups.find((candidate) => candidate._count.members < GROUP_SIZE)
    ?? await prisma.leagueGroup.create({ data: { weekId: week.id, tierId: tier.id }, select: { id: true } });

  const earned = await prisma.xpEvent.aggregate({ where: { userId, createdAt: { gte: startsOn } }, _sum: { amount: true } });
  await prisma.leagueMember.createMany({ data: [{ groupId: group.id, userId, weekXp: earned._sum.amount ?? 0 }], skipDuplicates: true });
  await prisma.profile.updateMany({ where: { id: userId, leagueTierId: null }, data: { leagueTierId: tier.id } });
  return true;
}

type TierRule = { position: number; up: number; down: number };

function parseRules(value: unknown): TierRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { position, up, down } = entry as Record<string, unknown>;
    return typeof position === "number" && typeof up === "number" && typeof down === "number" ? [{ position, up, down }] : [];
  });
}

/**
 * Clôture les semaines terminées : classe chaque groupe, applique montées et descentes (réglage « league.tierRules »,
 * proportionnel si le groupe n'a pas 10 membres), puis ouvre la semaine suivante en répartissant les étudiants par palier en groupes de 10.
 * À appeler chaque lundi (route /api/cron/league) ou depuis l'administration.
 */
export async function rolloverLeagueWeek(now = new Date()) {
  const currentMonday = mondayOf(now);
  const [tiers, rulesValue, openWeeks] = await Promise.all([
    prisma.leagueTier.findMany({ orderBy: { position: "asc" }, select: { id: true, position: true } }),
    getAppSetting("league.tierRules"),
    prisma.leagueWeek.findMany({ where: { closedAt: null, startsOn: { lt: currentMonday } }, select: { id: true } }),
  ]);
  const rules = parseRules(rulesValue);
  const tierByPosition = new Map(tiers.map((tier) => [tier.position, tier]));
  const maxPosition = tiers.length ? Math.max(...tiers.map((tier) => tier.position)) : 0;

  let closed = 0;
  for (const week of openWeeks) {
    const groups = await prisma.leagueGroup.findMany({
      where: { weekId: week.id },
      select: { id: true, tier: { select: { position: true } }, members: { orderBy: [{ weekXp: "desc" }, { userId: "asc" }], select: { userId: true } } },
    });
    for (const group of groups) {
      const size = group.members.length;
      const rule = rules.find((candidate) => candidate.position === group.tier.position);
      const up = group.tier.position >= maxPosition ? 0 : Math.round(((rule?.up ?? 3) * size) / GROUP_SIZE);
      const down = group.tier.position <= 1 ? 0 : Math.round(((rule?.down ?? 3) * size) / GROUP_SIZE);
      for (const [index, member] of group.members.entries()) {
        const rank = index + 1;
        const outcome = rank <= up ? "PROMOTED" : rank > size - down ? "DEMOTED" : "STAYED";
        const nextPosition = outcome === "PROMOTED" ? group.tier.position + 1 : outcome === "DEMOTED" ? group.tier.position - 1 : group.tier.position;
        await prisma.leagueMember.update({
          where: { groupId_userId: { groupId: group.id, userId: member.userId } },
          data: { finalRank: rank, outcome },
        });
        const nextTier = tierByPosition.get(nextPosition);
        if (nextTier) await prisma.profile.update({ where: { id: member.userId }, data: { leagueTierId: nextTier.id } });
      }
    }
    await prisma.leagueWeek.update({ where: { id: week.id }, data: { closedAt: now } });
    closed++;
  }

  // Nouvelle semaine : tous les anciens membres reprennent à leur palier actuel.
  const week = await prisma.leagueWeek.upsert({ where: { startsOn: currentMonday }, create: { startsOn: currentMonday }, update: {}, select: { id: true, closedAt: true } });
  let placed = 0;
  if (!week.closedAt) {
    const alreadyIn = await prisma.leagueMember.findMany({ where: { group: { weekId: week.id } }, select: { userId: true } });
    const skip = new Set(alreadyIn.map((row) => row.userId));
    const members = await prisma.profile.findMany({
      where: { leagueTierId: { not: null }, suspendedAt: null },
      select: { id: true, leagueTierId: true },
    });
    const byTier = new Map<string, string[]>();
    for (const member of members) {
      if (!member.leagueTierId || skip.has(member.id)) continue;
      byTier.set(member.leagueTierId, [...(byTier.get(member.leagueTierId) ?? []), member.id]);
    }
    for (const [tierId, ids] of byTier) {
      const chunks: string[][] = [];
      for (let start = 0; start < ids.length; start += GROUP_SIZE) chunks.push(ids.slice(start, start + GROUP_SIZE));
      if (chunks.length > 1 && chunks[chunks.length - 1].length < 5) {
        const last = chunks.pop()!;
        chunks[chunks.length - 1].push(...last);
      }
      for (const chunk of chunks) {
        const group = await prisma.leagueGroup.create({ data: { weekId: week.id, tierId }, select: { id: true } });
        await prisma.leagueMember.createMany({ data: chunk.map((userId) => ({ groupId: group.id, userId })), skipDuplicates: true });
        placed += chunk.length;
      }
    }
  }
  return { closedWeeks: closed, placed };
}
