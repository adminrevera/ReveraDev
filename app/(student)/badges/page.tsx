import type { Metadata } from "next";
import BadgeMedal from "@/components/student/BadgeMedal";
import { PageHeader, ProgressBar } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { readBadgeMetrics } from "@/lib/gamification/engine";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Badges · Revera" };

const categories = [
  { id: "DISCOVERY", label: "Découverte" },
  { id: "REGULARITY", label: "Régularité" },
  { id: "MASTERY", label: "Maîtrise" },
  { id: "COMPETITION", label: "Compétition" },
  { id: "EVENT", label: "Événements" },
] as const;

function ruleOf(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { metric, threshold } = value as Record<string, unknown>;
  return typeof metric === "string" && typeof threshold === "number" ? { metric, threshold } : null;
}

export default async function BadgesPage() {
  const { profile } = await requireStudentProfile();
  const [badges, owned] = await Promise.all([
    prisma.badge.findMany({ orderBy: [{ category: "asc" }, { position: "asc" }], select: { id: true, name: true, description: true, category: true, rule: true } }),
    prisma.userBadge.findMany({ where: { userId: profile.id }, select: { badgeId: true, awardedAt: true } }),
  ]);
  const ownedAt = new Map(owned.map((row) => [row.badgeId, row.awardedAt]));
  const pending = badges.flatMap((badge) => (ownedAt.has(badge.id) ? [] : [ruleOf(badge.rule)?.metric ?? ""])).filter(Boolean);
  const metrics = pending.length ? await readBadgeMetrics(profile.id, pending) : {};

  return (
    <>
      <PageHeader eyebrow="Succès" title="Badges">
        {owned.length} badge{owned.length > 1 ? "s" : ""} obtenu{owned.length > 1 ? "s" : ""} sur {badges.length}. Chaque badge se gagne tout seul, en progressant.
      </PageHeader>
      {badges.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">Le catalogue de badges n’est pas encore installé. Il sera ajouté depuis l’administration.</p>
      ) : (
        <div className="grid gap-9">
          {categories.map((category) => {
            const list = badges.filter((badge) => badge.category === category.id);
            if (!list.length) return null;
            return (
              <section key={category.id}>
                <h2 className="mb-3 text-xl font-semibold tracking-tight">{category.label} <span className="ml-2 text-sm font-normal text-muted">{list.filter((badge) => ownedAt.has(badge.id)).length} / {list.length}</span></h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((badge) => {
                    const earned = ownedAt.has(badge.id);
                    const rule = ruleOf(badge.rule);
                    const current = rule ? Math.min(metrics[rule.metric] ?? 0, rule.threshold) : 0;
                    return (
                      <article key={badge.id} className={`flex gap-4 rounded-2xl border p-4 ${earned ? "border-line bg-panel" : "border-dashed border-line bg-panel/50"}`}>
                        <BadgeMedal category={badge.category} earned={earned} />
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-semibold leading-snug ${earned ? "" : "text-muted"}`}>{badge.name}</h3>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted">{badge.description}</p>
                          {earned ? (
                            <p className="mt-2 text-xs text-accent">Obtenu le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(ownedAt.get(badge.id)!)}</p>
                          ) : rule && rule.threshold > 1 ? (
                            <div className="mt-2">
                              <ProgressBar percent={(current / rule.threshold) * 100} />
                              <p className="mt-1 text-[11px] text-muted">{current} / {rule.threshold}</p>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
