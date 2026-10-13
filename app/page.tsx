import Link from "next/link";
import Aurora from "@/components/brand/Aurora";
import CinematicJourney from "@/components/brand/CinematicJourney";
import LandingNav from "@/components/brand/LandingNav";
import Lumi from "@/components/brand/Lumi";
import Logo from "@/components/brand/Logo";
import Reveal from "@/components/brand/Reveal";
import { APP_NAME } from "@/lib/config";

const width = "mx-auto w-[min(1160px,calc(100%-32px))]";
const eyebrow = "font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-amber";
const heading = "text-balance text-[clamp(36px,5vw,60px)] leading-[1.06] font-semibold tracking-[-0.035em]";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink shadow-[0_12px_38px_-16px_var(--glow)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-amber";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-white/[.035] px-6 text-sm font-semibold text-fg transition duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white/[.07]";
const panel =
  "rounded-[26px] border border-line bg-linear-to-br from-white/[.055] to-white/[.018] shadow-[0_24px_75px_-48px_rgba(0,0,0,.8)]";

type IconName = "book" | "quiz" | "check" | "timer" | "chart" | "flame" | "arrow" | "spark" | "target" | "calendar";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const shapes: Record<IconName, React.ReactNode> = {
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22.5z" /><path d="M4 5.5v17M8 7h8M8 11h7" /></>,
    quiz: <><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" /><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-1.2 1.1-1.9 1.3-1.9 3" /><path d="M12 17.5h.01" /></>,
    check: <><path d="m5 12 4 4L19 6" /><path d="M20 12a8 8 0 1 1-4-6.9" /></>,
    timer: <><circle cx="12" cy="13" r="8.5" /><path d="M12 9v4l2.5 1.5M9 2h6M12 2v2.5" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /><path d="M16 6h4v4" /></>,
    flame: <><path d="M12 22c4.4 0 7-3.1 7-7.1 0-3.1-1.7-5.3-4.5-8.4.1 2.2-.5 3.3-1.4 4.1C12.9 6.2 10.9 3.6 8 2c.4 4.4-.7 6.2-2 8.4C4.9 12.2 4 13.5 4 15c0 4 3.1 7 8 7Z" /><path d="M12 22c-1.9-1.1-2.7-2.5-2.7-4.1 0-1.3.8-2.4 1.7-3.7.4 1.2 1 1.8 1.8 2.4.8-1.1.9-2 1-3.1 1.3 1.4 2 2.8 2 4.4 0 1.8-1 3.2-3.8 4.1Z" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="m16.5 7.5 4-4M17 3.5h3.5V7" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {shapes[name]}
    </svg>
  );
}

const features = [
  {
    icon: "book" as const,
    number: "01",
    title: "Des cours faciles à reprendre",
    text: "Des chapitres structurés et des résumés qui vont à l’essentiel pour réviser sans te disperser.",
  },
  {
    icon: "quiz" as const,
    number: "02",
    title: "La pratique qui fait progresser",
    text: "Des questions après les cours pour vérifier ce que tu as compris, pas seulement ce que tu as lu.",
  },
  {
    icon: "check" as const,
    number: "03",
    title: "Des corrections qui expliquent",
    text: "Comprends pourquoi une réponse est juste et transforme tes erreurs en prochaines pistes de révision.",
  },
  {
    icon: "timer" as const,
    number: "04",
    title: "Les examens blancs",
    text: "Entraîne-toi avec un format chronométré et mesure tes acquis avant le jour de l’épreuve.",
  },
];

const plans = [
  {
    id: "free",
    name: "Gratuit",
    price: "0",
    description: "Pour commencer à réviser dès maintenant.",
    items: ["Cours et résumés", "Quiz par chapitre", "Progression personnelle"],
    featured: false,
  },
  {
    id: "plus",
    name: "Plus",
    price: "1 500",
    description: "Pour garder le rythme et t’entraîner davantage.",
    items: ["Tout le plan Gratuit", "Entraînement et jeux", "Révision ciblée"],
    featured: true,
  },
  {
    id: "success",
    name: "Réussite",
    price: "3 000",
    description: "Pour pousser la préparation jusqu’aux épreuves.",
    items: ["Tout le plan Plus", "Examens blancs", "Corrections détaillées"],
    featured: false,
  },
];

const week = [
  { day: "L", done: true },
  { day: "M", done: true },
  { day: "M", done: true },
  { day: "J", done: true },
  { day: "V", done: true },
  { day: "S", done: false },
  { day: "D", done: false },
];

export default function Home() {
  return (
    <>
      <Aurora
        base={0.52}
        a1={0.12}
        a2={0.06}
        f1={3.8}
        f2={8.5}
        spread={0.42}
        className="pointer-events-none fixed inset-0 z-0 h-svh w-full opacity-[.4] mix-blend-screen"
      />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/75 backdrop-blur-2xl">
        <div className={`${width} flex min-h-[72px] items-center justify-between gap-3`}>
          <Link href="/" className="shrink-0 no-underline" aria-label={`${APP_NAME}, accueil`}>
            <Logo height={24} />
          </Link>
          <LandingNav />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              className="whitespace-nowrap rounded-full px-1 py-2 text-xs font-medium text-fg no-underline transition hover:text-accent sm:px-3 sm:text-sm"
              href="/connexion"
            >
              Connexion
            </Link>
            <Link className={`${primaryButton} min-h-10 whitespace-nowrap px-2 text-xs sm:px-5 sm:text-sm`} href="/inscription">
              <span className="sm:hidden">S’inscrire</span>
              <span className="hidden sm:inline">Créer un compte</span>
            </Link>
          </div>
        </div>
        <div className="border-t border-line/50 px-4 py-1.5 md:hidden">
          <LandingNav mobile />
        </div>
      </header>

      <main id="top" className="landing-main relative z-10">
        <section className="relative isolate overflow-hidden pb-12 pt-10 sm:pb-16 sm:pt-16 lg:min-h-[min(820px,calc(100svh-72px))] lg:pb-20 lg:pt-16">
          <div aria-hidden="true" className="halo pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="hero-orbit hero-orbit-one pointer-events-none absolute -right-40 top-[-18%] -z-10 size-[580px] rounded-full" />
          <div aria-hidden="true" className="hero-orbit hero-orbit-two pointer-events-none absolute -left-64 bottom-[-44%] -z-10 size-[680px] rounded-full" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_38%,rgba(11,13,28,.2)_72%,var(--bg)_100%)]"
          />
          <div className={`${width} relative z-10 grid items-center gap-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-10`}>
            <div className="relative z-10">
              <span className={`${eyebrow} hero-enter inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/[.06] px-3.5 py-2`}>
                <span className="size-1.5 rounded-full bg-amber shadow-[0_0_12px_var(--amber)]" />
                La plateforme de révision pensée pour les étudiants
              </span>
              <h1 className="hero-enter hero-enter-delay-1 mt-6 max-w-[16ch] text-[clamp(44px,6.1vw,76px)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">
                Arrive à l’examen <span className="text-accent">sûr de toi.</span>
              </h1>
              <div className="hero-enter hero-enter-delay-2 mt-5 flex items-center gap-2.5 sm:mt-6">
                <p className="min-w-0 max-w-[520px] flex-1 text-[clamp(15px,1.6vw,18px)] leading-[1.65] text-muted">
                  Révise avec méthode : cours, entraînements et examens blancs réunis au même endroit, pour toutes les filières et tous les établissements.
                </p>
                <div className="shrink-0 sm:hidden">
                  <Lumi mood="studieuse" size={80} title="Lumi t’accompagne dans tes révisions" />
                </div>
              </div>
              <div className="hero-enter hero-enter-delay-2 mt-8 flex flex-wrap gap-3">
                <Link className={primaryButton} href="/inscription">
                  Commencer gratuitement <Icon name="arrow" size={17} />
                </Link>
                <a className={secondaryButton} href="#parcours">
                  Découvrir Revera
                </a>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted sm:text-sm">
                <span className="inline-flex items-center gap-2"><Icon name="check" size={16} /> Cours gratuits</span>
                <span className="inline-flex items-center gap-2"><Icon name="target" size={16} /> À ton rythme</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[570px] px-1 pb-28 pt-2 sm:px-5 sm:pb-32 sm:pt-5 lg:mt-0">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[7%] -z-10 rounded-full bg-accent/[.11] blur-[70px]"
              />
              <div className={`${panel} hero-enter hero-enter-delay-1 relative z-10 p-4 sm:p-5`}>
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="chart" size={17} /></span>
                    <div>
                      <p className="text-sm font-semibold">Ta progression</p>
                      <p className="text-[11px] text-muted">Un pas après l’autre</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-line bg-white/[.035] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-muted">Aperçu</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_1.05fr]">
                  <div className="flex min-h-[158px] items-center gap-3 rounded-2xl border border-line bg-bg2/80 p-3.5 sm:flex-col sm:justify-center sm:gap-2 sm:p-4">
                    <div className="relative grid size-[88px] shrink-0 place-items-center sm:size-[96px]">
                      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                        <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(203,210,255,.12)" strokeWidth="7" />
                        <circle className="progress-ring" cx="50" cy="50" r="35" fill="none" stroke="var(--amber)" strokeWidth="7" strokeLinecap="round" pathLength="220" />
                      </svg>
                      <span className="text-2xl font-semibold tracking-tight">72<span className="text-sm text-muted">%</span></span>
                    </div>
                    <div className="min-w-0 sm:text-center">
                      <p className="text-sm font-semibold">Prêt à progresser</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">Une vue claire de tes acquis, matière par matière.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-line bg-bg2/80 p-3.5 sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Cette semaine</p>
                        <p className="text-[11px] text-muted">Chaque séance compte</p>
                      </div>
                      <span className="streak-pulse inline-flex items-center gap-1.5 rounded-full bg-amber/[.1] px-2.5 py-1 text-xs font-semibold text-amber">
                        <Icon name="flame" size={14} /> 5 jours
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                      {week.map((day, index) => (
                        <div key={`${day.day}-${index}`} className="streak-day flex min-w-0 flex-col items-center gap-1.5">
                          <span className="text-[9px] font-medium text-muted sm:text-[10px]">{day.day}</span>
                          <span className={`grid aspect-square w-full place-items-center rounded-[9px] border ${
                            day.done
                              ? "border-amber/25 bg-amber/[.12] text-amber"
                              : "border-line bg-white/[.025] text-muted/55"
                          }`}>
                            {day.done ? <Icon name="check" size={13} /> : <span className="text-[10px]">·</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] leading-relaxed text-muted">Reviens demain pour prolonger ta série.</p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-line bg-bg2/80 p-3.5 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">À revoir en priorité</p>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted">Aujourd’hui</span>
                  </div>
                  <div className="grid gap-2">
                    {[
                      { label: "Droit", detail: "Chapitre 3 · 8 questions", value: "84%", fill: "w-[84%]" },
                      { label: "Réseaux", detail: "Adressage IP · 6 questions", value: "68%", fill: "w-[68%]" },
                      { label: "Statistiques", detail: "Variables aléatoires · 5 questions", value: "41%", fill: "w-[41%]" },
                    ].map((subject) => (
                      <div key={subject.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{subject.label}</p>
                          <p className="truncate text-[10px] text-muted">{subject.detail}</p>
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-muted">{subject.value}</span>
                        <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                          <span className={`block h-full rounded-full bg-linear-to-r from-accent to-amber ${subject.fill}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hero-float absolute -right-1 top-0 z-20 hidden items-center gap-2.5 rounded-2xl border border-line bg-panel/95 px-3.5 py-2.5 shadow-xl backdrop-blur sm:flex sm:-right-2">
                <span className="grid size-8 place-items-center rounded-xl bg-amber/[.12] text-amber"><Icon name="flame" size={17} /></span>
                <span className="text-xs"><b className="block text-fg">Ta série continue</b><span className="text-muted">5 jours de régularité</span></span>
              </div>
              <div className="hero-float-delay absolute -bottom-1 left-0 z-20 hidden items-center gap-2.5 rounded-2xl border border-line bg-panel/95 px-3 py-2 shadow-xl backdrop-blur sm:flex sm:-left-1">
                <span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="check" size={17} /></span>
                <span className="text-xs"><b className="block text-fg">Bien joué !</b><span className="text-muted">Une notion de plus acquise</span></span>
              </div>

              <div className="lumi-stage pointer-events-none absolute bottom-1 right-2 z-30 hidden sm:block sm:right-5 lg:right-1">
                <Lumi mood="studieuse" size={148} title="Lumi, la luciole de Revera, t’encourage à réviser" />
              </div>
            </div>
          </div>
          <div className="hero-scroll-cue pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
            <span className="font-mono text-[9px] uppercase tracking-[.2em] text-muted/75">Explorer</span>
            <span className="relative h-8 w-px overflow-hidden bg-white/10">
              <span className="hero-scroll-beam absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-amber to-accent" />
            </span>
          </div>
        </section>

        <section id="avantages" className="cinematic-scene cinematic-scene-method scroll-mt-24 py-16 sm:py-24">
          <div className={width}>
            <Reveal>
              <div className="mb-10 grid max-w-[700px] gap-4 sm:mb-12">
                <p className={eyebrow}>Tout pour apprendre avec intention</p>
                <h2 className={heading}>Moins de dispersion. <span className="font-serif font-normal italic text-accent">Plus de progrès.</span></h2>
                <p className="max-w-[600px] text-base leading-relaxed text-muted">
                  Revera rassemble les étapes qui transforment une révision en compréhension durable.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Reveal key={feature.number} delay={Number(feature.number) * 75}>
                  <article className={`${panel} group flex min-h-[230px] flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/35 sm:p-6`}>
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-2xl border border-accent/15 bg-accent/[.08] text-accent transition group-hover:bg-accent group-hover:text-accent-ink">
                        <Icon name={feature.icon} size={21} />
                      </span>
                      <span className="font-mono text-xs text-muted/60">{feature.number}</span>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold leading-snug tracking-[-0.02em]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{feature.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <CinematicJourney />

        <section id="offres" className="cinematic-scene cinematic-scene-plans scroll-mt-24 py-16 sm:py-24">
          <div className={width}>
            <Reveal className="mx-auto">
              <div className="mx-auto mb-10 grid max-w-[700px] gap-4 text-center sm:mb-12">
                <p className={eyebrow}>Les offres Revera</p>
                <h2 className={heading}>Commence gratuitement. <span className="font-serif font-normal italic text-accent">Évolue à ton rythme.</span></h2>
                <p className="text-base leading-relaxed text-muted">
                  Choisis l’accompagnement qui correspond à ta façon de préparer les examens.
                </p>
              </div>
            </Reveal>
            <div className="mx-auto grid max-w-[1040px] items-stretch gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Reveal key={plan.id} delay={plan.featured ? 100 : 0}>
                  <article
                    className={`relative flex min-w-0 flex-col rounded-[26px] border p-5 sm:p-6 ${
                      plan.featured
                        ? "border-accent/55 bg-linear-to-b from-accent/[.13] to-panel shadow-[0_24px_75px_-38px_var(--glow)] md:-translate-y-2"
                        : "border-line bg-panel/70"
                    }`}
                  >
                    {plan.featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.1em] text-accent-ink">
                        Le plus choisi
                      </span>
                    )}
                    <p className="font-mono text-xs uppercase tracking-[.12em] text-muted">{plan.name}</p>
                    <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-4xl font-semibold tracking-[-.05em]">{plan.price}</span>
                      <span className="font-mono text-xs text-muted">FCFA</span>
                    </div>
                    <p className="mt-3 min-h-[42px] text-sm leading-relaxed text-muted">{plan.description}</p>
                    <ul className="mt-5 grid gap-3 border-t border-line pt-5 text-sm">
                      {plan.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-amber"><Icon name="check" size={16} /></span>
                          <span className="text-fg/90">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      className={`${plan.featured ? primaryButton : secondaryButton} mt-6 w-full`}
                      href={`/inscription?plan=${plan.id}`}
                    >
                      {plan.id === "free" ? "Créer mon compte" : `Choisir ${plan.name}`}
                      <Icon name="arrow" size={16} />
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className={`${width} relative isolate overflow-hidden rounded-[30px] border border-line bg-panel px-6 py-10 sm:px-10 sm:py-14 lg:px-16`}>
            <div aria-hidden="true" className="halo pointer-events-none absolute inset-0 -z-10 opacity-70" />
            <Aurora
              base={0.55}
              a1={0.18}
              a2={0.08}
              f1={4}
              f2={9}
              spread={0.5}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-45 mix-blend-screen"
            />
            <div className="relative z-10 grid items-center gap-6 sm:grid-cols-[1fr_auto] sm:gap-8">
              <div>
                <p className={eyebrow}>Prêt·e à commencer?</p>
                <h2 className="mt-3 max-w-[650px] text-[clamp(32px,5vw,52px)] leading-[1.02] font-semibold tracking-[-.045em]">
                  Ta prochaine séance commence <span className="font-serif font-normal italic text-accent">ici.</span>
                </h2>
                <p className="mt-3 max-w-[500px] text-sm leading-relaxed text-muted sm:text-base">
                  Crée ton espace et avance à ton rythme, une notion après l’autre.
                </p>
              </div>
              <Link className={`${primaryButton} w-full sm:w-auto`} href="/inscription">
                Rejoindre Revera <Icon name="arrow" size={17} />
              </Link>
            </div>
            <div className="pointer-events-none absolute -right-2 -bottom-14 hidden opacity-70 sm:block">
              <Lumi mood="contente" size={114} title="Lumi, la luciole de Revera" />
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line/70 py-7">
        <div className={`${width} flex flex-col items-start justify-between gap-4 text-xs text-muted sm:flex-row sm:items-center`}>
          <Link href="/" className="no-underline"><Logo height={27} animated={false} /></Link>
          <p className="m-0">© {new Date().getFullYear()} {APP_NAME} · Plateforme indépendante, toutes filières et tous établissements</p>
          <a className="transition hover:text-fg" href="#top">Retour en haut ↑</a>
        </div>
      </footer>
    </>
  );
}
