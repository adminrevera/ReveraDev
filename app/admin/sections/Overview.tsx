import { Prisma, Role } from "@prisma/client";
import { AdminHeading, AdminPanel } from "@/components/admin/AdminShell";
import LumiCompanion from "@/components/brand/LumiCompanion";
import { prisma } from "@/lib/prisma";

const money = (amount: number) => new Intl.NumberFormat("fr-FR").format(amount);
const date = (value: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);

type Day = { day: Date; n: number };

function BarChart({ data, label }: { data: Day[]; label: string }) {
  const max = Math.max(1, ...data.map((entry) => entry.n));
  const width = 100 / Math.max(data.length, 1);
  const total = data.reduce((sum, entry) => sum + entry.n, 0);
  return (
    <figure>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={`${label} : ${total} sur ${data.length} jours`} className="h-32 w-full">
        {data.map((entry, index) => {
          const height = (entry.n / max) * 36;
          return <rect key={index} x={index * width + width * 0.15} y={38 - height} width={width * 0.7} height={Math.max(height, entry.n ? 0.8 : 0.3)} rx="0.6" className="fill-accent/70"><title>{`${entry.day.toISOString().slice(0, 10)} : ${entry.n}`}</title></rect>;
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-muted"><span>{data[0]?.day.toISOString().slice(5, 10)}</span><span>{total} au total · pic {max}</span><span>{data[data.length - 1]?.day.toISOString().slice(5, 10)}</span></figcaption>
    </figure>
  );
}

async function daily(table: "Profile" | "Attempt" | "Payment", column: string, extra: Prisma.Sql = Prisma.empty): Promise<Day[]> {
  const rows = await prisma.$queryRaw<{ day: Date; n: bigint }[]>(Prisma.sql`
    SELECT d::date AS day, COALESCE(c.n, 0)::bigint AS n
    FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS d
    LEFT JOIN (
      SELECT ${Prisma.raw(`"${column}"`)}::date AS day, COUNT(*) AS n FROM ${Prisma.raw(`"${table}"`)}
      WHERE ${Prisma.raw(`"${column}"`)} >= CURRENT_DATE - INTERVAL '13 days' ${extra}
      GROUP BY 1
    ) c ON c.day = d::date
    ORDER BY d`);
  return rows.map((row) => ({ day: new Date(row.day), n: Number(row.n) }));
}

export default async function Overview() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [students, pendingReview, pendingPayments, openTickets, generation, logs, signups, answers, paid, revenue, subscribers, chaptersValidated] = await Promise.all([
    prisma.profile.count({ where: { role: Role.STUDENT } }),
    prisma.contentVersion.count({ where: { status: { in: ["AI_DRAFT", "IN_REVIEW", "APPROVED"] } } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.generationJob.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { costUsd: true }, _count: true }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, createdAt: true, action: true, entity: true, actor: { select: { displayName: true, email: true } } } }),
    daily("Profile", "createdAt", Prisma.sql`AND "role" = 'STUDENT'`),
    daily("Attempt", "answeredAt"),
    daily("Payment", "paidAt", Prisma.sql`AND "status" = 'PAID'`),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountXof: true } }),
    prisma.subscription.count(),
    prisma.chapterProgress.count({ where: { completedAt: { not: null } } }),
  ]);
  const cards: [string, string | number, string][] = [
    ["Étudiants", students, "Comptes enregistrés"],
    ["Abonnements", subscribers, "Activés (dont par code e-mail)"],
    ["Revenus confirmés", `${money(revenue._sum.amountXof ?? 0)} FCFA`, "Paiements réussis"],
    ["Chapitres validés", chaptersValidated, "Tous étudiants confondus"],
    ["À relire", pendingReview, "Brouillons, relecture ou approbation"],
    ["Paiements en attente", pendingPayments, "Statut en attente"],
    ["Tickets ouverts", openTickets, "Demandes d’aide"],
    ["Coût IA du mois", `$${generation._sum.costUsd?.toFixed(2) ?? "0.00"}`, `${generation._count} génération(s)`],
  ];
  return (
    <>
      <AdminHeading eyebrow="Espace réservé" title="Vue d’ensemble" description="Comptes, activité des 14 derniers jours, paiements et ce qui attend une décision." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, detail]) => (
          <article key={label} className="rounded-2xl border border-line bg-panel p-5">
            <p className="text-sm text-muted">{label}</p><p className="mt-3 text-2xl font-semibold sm:text-3xl">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <AdminPanel title="Inscriptions"><BarChart data={signups} label="Inscriptions" /></AdminPanel>
        <AdminPanel title="Réponses aux questions"><BarChart data={answers} label="Réponses" /></AdminPanel>
        <AdminPanel title="Paiements réussis"><BarChart data={paid} label="Paiements réussis" /></AdminPanel>
      </div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <AdminPanel title="Activité administrative récente">
          {logs.length === 0 ? <p className="text-sm text-muted">Les actions sensibles apparaîtront ici.</p> : (
            <ul className="divide-y divide-line">
              {logs.map((log) => <li key={log.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span><b className="font-medium">{log.action}</b><span className="ml-2 text-muted">{log.entity}</span><span className="ml-2 text-xs text-muted">{log.actor?.displayName ?? log.actor?.email ?? "Système"}</span></span>
                <time className="text-xs text-muted">{date(log.createdAt)}</time>
              </li>)}
            </ul>
          )}
        </AdminPanel>
        <LumiCompanion
          context="État de l’administration"
          message={pendingReview ? `${pendingReview} version${pendingReview === 1 ? "" : "s"} attend${pendingReview === 1 ? "" : "ent"} une relecture humaine.` : openTickets ? `${openTickets} ticket${openTickets === 1 ? "" : "s"} ouvert${openTickets === 1 ? "" : "s"} à suivre.` : "Tout est calme pour le moment."}
          initialMood={pendingReview ? "studieuse" : openTickets ? "fatiguee" : "contente"}
        />
      </div>
    </>
  );
}
