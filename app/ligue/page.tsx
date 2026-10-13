import type { Metadata } from "next";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ligue · Revera" };

export default async function LeaguePage() {
  const { profile } = await requireStudentProfile();
  const membership = await prisma.leagueMember.findFirst({
    where: { userId: profile.id, group: { week: { closedAt: null } } },
    orderBy: { group: { week: { startsOn: "desc" } } },
    include: {
      group: {
        include: {
          week: true,
          tier: true,
          members: {
            orderBy: [{ weekXp: "desc" }, { user: { displayName: "asc" } }],
            include: { user: { select: { id: true, displayName: true } } },
          },
        },
      },
    },
  });

  return (
    <StudentShell role={profile.role}>
      <header className="mb-7">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Compétition</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Ligue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">La ligue hebdomadaire se débloque après deux chapitres validés.</p>
      </header>
      {!membership ? (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-amber">Prochaine étape</p>
          <h2 className="mt-3 text-xl font-semibold">Ta place dans la ligue se prépare</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Valide au moins deux chapitres. Si le classement hebdomadaire est activé, tu verras ici ton groupe et les points gagnés par chacun.</p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-accent/20 bg-accent/[.05] p-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Semaine du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(membership.group.week.startsOn)}</p>
            <h2 className="mt-2 text-2xl font-semibold">{membership.group.tier.name}</h2>
            <p className="mt-1 text-sm text-muted">{membership.group.members.length} étudiant{membership.group.members.length === 1 ? "" : "s"} · {membership.weekXp} XP cette semaine</p>
          </section>
          <ol className="mt-4 grid gap-2">
            {membership.group.members.map((member, index) => <li key={member.userId} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${member.userId === profile.id ? "border-accent/40 bg-accent/[.07]" : "border-line bg-panel"}`}>
              <span className="flex items-center gap-3"><b className="w-8 text-sm text-amber">#{index + 1}</b><span className="text-sm">{member.user.displayName ?? "Étudiant"}{member.userId === profile.id ? " · toi" : ""}</span></span><span className="text-sm font-semibold">{member.weekXp} XP</span>
            </li>)}
          </ol>
        </>
      )}
    </StudentShell>
  );
}
