import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Mon espace · ${APP_NAME}`,
};

const goalLabels: Record<string, string> = {
  exams: "Réussir mes examens",
  regularity: "Réviser régulièrement",
  confidence: "Gagner en confiance",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(`Impossible de vérifier la session : ${error.message}`);
  if (!user) redirect("/connexion");
  if (!user.user_metadata?.onboardingCompleted) redirect("/onboarding");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      displayName: true,
      email: true,
      level: {
        select: {
          name: true,
          track: {
            select: {
              name: true,
              institution: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!profile) {
    throw new Error("Le profil associé à cette session est introuvable. Réessaie l’onboarding.");
  }

  const firstName = profile.displayName?.trim().split(/\s+/)[0] || "Étudiant";
  const goal = user.user_metadata?.onboardingGoal;

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-line bg-bg2/80">
        <div className="mx-auto flex w-[min(1120px,calc(100%-32px))] items-center justify-between gap-4 py-4">
          <Link href="/dashboard" className="text-xl font-bold tracking-[-0.05em] text-fg no-underline">
            <span className="mr-2 inline-grid size-8 place-items-center rounded-xl bg-lime text-sm text-lime-ink">
              R
            </span>
            {APP_NAME}
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-[min(1120px,calc(100%-32px))] py-10 sm:py-14">
        <section className="relative isolate overflow-hidden rounded-[30px] border border-line bg-linear-to-br from-lime/[.12] via-panel to-bg2 p-6 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-20 -z-10 size-72 rounded-full bg-lime/[.08] blur-[90px]"
          />
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-lime">Ton espace Revera</p>
          <h1 className="mt-4 text-[clamp(36px,7vw,64px)] leading-[.98] font-semibold tracking-[-0.05em]">
            Bonjour, <span className="font-serif font-normal italic text-lime">{firstName}.</span>
          </h1>
          <p className="mt-4 max-w-[42em] text-base leading-relaxed text-muted sm:text-lg">
            Ton espace est prêt. Tu peux retrouver ici les informations de ton compte et continuer
            à préparer ta progression.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-[24px] border border-line bg-panel p-6 sm:p-7">
            <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted">Mon profil</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{profile.displayName}</h2>
            <p className="mt-1 break-all text-sm text-muted">{profile.email}</p>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs uppercase tracking-wide text-muted">Mon parcours</p>
              <p className="mt-1 text-sm text-fg">
                {profile.level
                  ? `${profile.level.name} · ${profile.level.track.name} · ${profile.level.track.institution.name}`
                  : "Ton niveau d’études n’est pas encore renseigné."}
              </p>
            </div>
          </article>

          <article className="flex flex-col rounded-[24px] border border-line bg-panel p-6 sm:p-7">
            <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted">Mon objectif</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {typeof goal === "string" && goalLabels[goal] ? goalLabels[goal] : "Avancer à mon rythme"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Garde cet objectif en tête pendant tes révisions. Tu pourras le faire évoluer avec
              ton parcours.
            </p>
            <Link
              href="/#parcours"
              className="mt-auto inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-lime bg-lime px-5 text-sm font-semibold text-lime-ink no-underline transition hover:-translate-y-px"
            >
              Découvrir le parcours
            </Link>
          </article>
        </section>

        <section className="mt-6 rounded-[24px] border border-line bg-bg2 p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-lime">Prochaine étape</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            Construis ta routine de révision
          </h2>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-muted">
            Commence par explorer le fonctionnement de Revera. Ton espace est prêt à accueillir tes
            prochaines étapes.
          </p>
          <Link
            href="/#resultats"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white/5 px-5 text-sm font-semibold text-fg no-underline transition hover:border-lime/50"
          >
            Voir ce que tu peux travailler
          </Link>
        </section>
      </div>
    </main>
  );
}
