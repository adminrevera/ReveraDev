import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { requireStudentProfile } from "@/lib/auth/access";
import { getFirstCourse } from "@/lib/student/first-course";

export const metadata: Metadata = { title: `Bienvenue · ${APP_NAME}` };

const nextSteps = [
  {
    number: "01",
    title: "Lis un chapitre",
    description: "Avance dans le cours à ton rythme. Le quiz se débloque quand tu arrives à la fin.",
  },
  {
    number: "02",
    title: "Valide tes acquis",
    description: "Réponds au quiz et comprends tes erreurs pour ouvrir la suite du parcours.",
  },
  {
    number: "03",
    title: "Construis ta progression",
    description: "Gagne de l’XP, garde ta série et retrouve tes prochaines révisions au même endroit.",
  },
];

export default async function WelcomePage() {
  const { profile } = await requireStudentProfile();
  const firstCourse = profile.levelId ? await getFirstCourse(profile.levelId) : null;
  const firstName = profile.displayName?.trim().split(/\s+/)[0] || "Étudiant";
  const destination = firstCourse ? `/parcours/${firstCourse.id}` : "/dashboard";

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <div aria-hidden="true" className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-accent/25 bg-accent/[.08] text-2xl font-semibold text-accent">
          ✓
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-amber">Ton espace est prêt</p>
        <h1 className="mt-3 text-[clamp(32px,7vw,48px)] font-semibold leading-tight tracking-[-.045em]">
          Bienvenue, <span className="font-serif font-normal italic text-accent">{firstName}</span> !
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Voici les trois étapes pour avancer sereinement dans tes révisions.
        </p>
      </header>

      <section aria-label="Comment fonctionne Revera" className="grid gap-3">
        {nextSteps.map((item) => (
          <Card key={item.number} className="border border-line bg-panel">
            <CardContent className="flex items-start gap-4 p-4 sm:p-5">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/[.08] font-mono text-xs font-semibold text-accent">
                {item.number}
              </span>
              <div>
                <h2 className="font-semibold text-fg">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {firstCourse && (
        <p className="mt-4 rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-muted">
          Ton premier cours : <span className="font-medium text-fg">{firstCourse.subject.name} · {firstCourse.title}</span>
        </p>
      )}

      <div className="mt-6 grid gap-2">
        <Link href={destination} className={buttonVariants({ size: "lg", className: "min-h-12 w-full rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink hover:bg-accent/90" })}>
          {firstCourse ? "Commencer le premier chapitre" : "Découvrir mon accueil"}
        </Link>
        {firstCourse && (
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg", className: "min-h-11 w-full rounded-full text-muted hover:text-fg" })}>
            Voir l’accueil d’abord
          </Link>
        )}
      </div>
    </main>
  );
}
