import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, PageHeader, primaryButton } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Abonnement · Revera" };

const tierLabel = { FREE: "Gratuit", PLUS: "Plus", SUCCESS: "Réussite" } as const;

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ active?: string }> }) {
  const { profile } = await requireStudentProfile();
  const { active } = await searchParams;
  const [plans, limits, current] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: [{ tier: "asc" }, { durationDays: "asc" }], select: { id: true, slug: true, name: true, tier: true, priceXof: true, durationDays: true } }),
    prisma.tierLimits.findMany(),
    prisma.profile.findUnique({ where: { id: profile.id }, select: { premiumUntil: true } }),
  ]);
  const limitsByTier = new Map(limits.map((row) => [row.tier, row]));
  const features = (tier: "PLUS" | "SUCCESS") => {
    const row = limitsByTier.get(tier);
    if (!row) return [];
    return [
      row.dailyTrainingSessions === null ? "Séances d’entraînement illimitées" : `${row.dailyTrainingSessions} séances par jour`,
      row.spacedReview ? "Révision espacée" : null,
      row.dailyGames === null ? "Jeux illimités" : null,
      row.examsPerSubject === null ? "Simulateurs illimités par matière" : `${row.examsPerSubject} simulateurs par matière`,
      row.detailedExamCorrection ? "Correction détaillée des examens" : null,
      row.helpGroup ? "Groupe d’entraide" : null,
    ].filter((entry): entry is string => Boolean(entry));
  };
  const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

  return (
    <>
      <PageHeader eyebrow="Offres" title="Abonnement">
        {profile.tier === "FREE" ? "Tu es sur l’offre Gratuit. Passe à Plus ou Réussite quand tu veux." : `Offre ${tierLabel[profile.tier]} active${current?.premiumUntil ? ` jusqu’au ${fmt.format(current.premiumUntil)}` : ""}.`}
      </PageHeader>
      {active === "1" && <p className="mb-6 rounded-2xl border border-accent/30 bg-accent/[.08] px-5 py-4 text-sm">Ton abonnement est activé. Merci !</p>}
      {plans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">Les offres ne sont pas encore configurées.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {(["PLUS", "SUCCESS"] as const).map((tier) => {
            const tierPlans = plans.filter((plan) => plan.tier === tier);
            if (!tierPlans.length) return null;
            return (
              <section key={tier} className={`rounded-2xl border p-6 ${profile.tier === tier ? "border-accent bg-accent/[.06]" : "border-line bg-panel"}`}>
                <Eyebrow>{profile.tier === tier ? "Ton offre" : "Offre"}</Eyebrow>
                <h2 className="mt-1 text-2xl font-semibold">{tierLabel[tier]}</h2>
                <ul className="mt-4 grid gap-1.5 text-sm text-muted">{features(tier).map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <div className="mt-5 grid gap-3">
                  {tierPlans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg2 p-3.5">
                      <div><p className="text-sm font-semibold">{plan.durationDays >= 150 ? "Semestre" : "Mensuel"}</p><p className="text-xs text-muted">{plan.priceXof.toLocaleString("fr-FR")} FCFA · {plan.durationDays} jours</p></div>
                      <Link href={`/paiement/${plan.slug}`} className={`${primaryButton} !min-h-10 !px-5 text-sm`}>Choisir</Link>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-muted">Paiement par Mixx by Yas ou Moov Money (Flooz). Les prix affichés sont ceux enregistrés dans l’administration.</p>
    </>
  );
}
