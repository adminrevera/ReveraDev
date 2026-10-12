import Link from "next/link";
import Aurora from "@/components/Aurora";
import { APP_NAME } from "@/lib/config";

/* ───────────── styles réutilisés ───────────── */

const wrap = "mx-auto w-[min(1180px,calc(100%-32px))]";
const mono = "font-mono text-xs uppercase tracking-[0.06em] text-muted";
const btn =
  "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-line bg-white/5 px-[22px] text-[15px] font-semibold text-fg no-underline transition hover:-translate-y-px";
const btnLime =
  "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-lime bg-lime px-[22px] text-[15px] font-semibold text-lime-ink no-underline shadow-[0_10px_40px_-10px_var(--glow)] transition hover:-translate-y-px hover:shadow-[0_0_0_6px_rgba(212,255,61,.14),0_10px_40px_-8px_var(--glow)]";
const sectionTitle =
  "text-[clamp(34px,5vw,60px)] leading-none font-semibold tracking-[-0.035em] text-balance";
const serif = "font-serif font-normal italic text-lime";
const cellBase = "flex min-w-0 flex-col gap-[18px] overflow-hidden rounded-[26px] border p-7";
const cell = `${cellBase} border-line bg-linear-to-br from-white/[.06] to-white/[.015]`;
const cellLime = `${cellBase} border-lime bg-lime text-lime-ink`;
const mini = "mt-auto rounded-2xl border border-line bg-black/40 p-4";

/* ───────────── petites pièces ───────────── */

function Icon({
  paths,
  size = 24,
  stroke = "currentColor",
  sw = 2,
}: {
  paths: string[];
  size?: number;
  stroke?: string;
  sw?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const ICONS = {
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  flame: ["M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"],
  book: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z", "M4 21V5"],
  help: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7", "M12 17h.01"],
  check: ["M5 12l5 5 9-10"],
  timer: ["M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M12 9v4l2 2", "M9 2h6"],
  trend: ["M4 19l5-6 4 3 7-9", "M15 7h5v5"],
};

function SubjectRows() {
  const rows = [
    { name: "Droit", value: 84, warn: false },
    { name: "Réseaux", value: 68, warn: false },
    { name: "Statistiques", value: 41, warn: true },
  ];
  return (
    <div className="grid gap-2.5">
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[78px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[96px_1fr_auto]">
          <span>{r.name}</span>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <i
              className={`block h-full rounded-full ${
                r.warn ? "bg-linear-to-r from-[#B27B12] to-warn" : "bg-linear-to-r from-[#7DBF1A] to-lime"
              }`}
              style={{ width: `${r.value}%` }}
            />
          </div>
          <span className="font-mono text-[13px] tabular-nums text-muted">{r.value}%</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────── données de la page ───────────── */

const FLOW = [
  { title: "Lis", text: "Un cours clair et gratuit, qui s'ouvre chapitre après chapitre.", icon: ICONS.book },
  { title: "Réponds", text: "Un quiz qui se débloque quand tu as fini de lire.", icon: ICONS.help },
  { title: "Comprends", text: "La correction explique chaque réponse.", icon: ICONS.check },
  { title: "Simule", text: "Un examen blanc chronométré, noté sur 20.", icon: ICONS.timer },
  { title: "Progresse", text: "Ton niveau monte, ton prochain objectif s'affiche.", icon: ICONS.trend, hot: true },
];

// Limites alignées sur la configuration actuelle (à confirmer avec le développeur). Prix provisoires.
const PLANS = [
  {
    name: "Gratuit",
    price: "0",
    unit: "FCFA",
    cta: "Créer mon compte",
    featured: false,
    items: [
      "Tous les cours et le quiz de chaque chapitre",
      "2 séances d'entraînement par jour",
      "1 jeu par jour",
      "1 examen blanc par matière",
      "Série de jours, XP et ligue",
    ],
  },
  {
    name: "Plus",
    price: "1 500",
    unit: "FCFA / mois",
    cta: "Choisir Plus",
    featured: true,
    items: [
      "Entraînement et jeux sans limite",
      "Révision espacée sur tes points faibles",
      "3 examens blancs par matière",
      "1 gel de série par mois",
    ],
  },
  {
    name: "Réussite",
    price: "3 000",
    unit: "FCFA / mois",
    cta: "Choisir Réussite",
    featured: false,
    items: [
      "Tout Plus",
      "Examens blancs sans limite",
      "Correction détaillée des examens",
      "Groupe d'entraide des abonnés",
      "2 gels de série par mois",
    ],
  },
];

/* ───────────── page ───────────── */

export default function Home() {
  return (
    <>
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur-md">
        <div className={`${wrap} flex items-center justify-between gap-4 py-3.5`}>
          <a href="#top" className="text-2xl font-bold tracking-[-0.05em] no-underline" aria-label={`${APP_NAME}, accueil`}>
            {APP_NAME}
          </a>
          <nav className="flex items-center gap-1.5" aria-label="Navigation principale">
            <a className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted no-underline hover:text-fg sm:block" href="#resultats">
              Résultats
            </a>
            <a className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted no-underline hover:text-fg sm:block" href="#parcours">
              Parcours
            </a>
            <a className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted no-underline hover:text-fg sm:block" href="#offre">
              Offre
            </a>
            <Link className="rounded-full px-3 py-2 text-sm font-medium text-fg no-underline hover:text-lime" href="/connexion">
              Se connecter
            </Link>
            <Link className={`${btnLime} min-h-[42px]! px-[18px]! text-sm!`} href="/inscription">
              Commencer
            </Link>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* Héros */}
        <div className="relative isolate overflow-hidden pt-14 pb-10">
          <Aurora base={0.42} a1={0.16} a2={0.07} f1={5.2} f2={11} spread={0.42} className="absolute inset-0 -z-10 h-full w-full opacity-95" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_70%_at_20%_0%,transparent_40%,var(--bg)_100%),linear-gradient(180deg,transparent_60%,var(--bg))]" />

          <div className={`${wrap} grid items-center gap-9 md:grid-cols-[1.05fr_1fr] md:gap-12`}>
            <div>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white/5 px-3.5 py-[7px] font-mono text-[13px] tracking-[0.02em]">
                <b className="inline-block size-[7px] rounded-full bg-lime shadow-[0_0_10px_var(--lime)]" />
                Bachelor 1 et 2 · Collège de Paris Lomé
              </span>
              <h1 className="mt-[22px] text-[clamp(44px,7.2vw,92px)] leading-[.96] font-semibold tracking-[-0.035em] text-balance">
                Arrive à l&apos;examen <span className={`${serif} inline-block text-[1.06em]`}>sûr de toi.</span>
              </h1>
              <p className="mt-[22px] max-w-[30em] text-[clamp(17px,2vw,20px)] text-[#C3CDB7]">
                {APP_NAME} te dit quoi réviser, te fait t&apos;entraîner dans les conditions du jour J et te montre où tu en es, matière par matière.
              </p>
              <div className="mt-[30px] flex flex-wrap gap-3">
                <Link className={btnLime} href="/inscription">
                  Commencer gratuitement
                  <Icon paths={ICONS.arrow} size={16} sw={2.6} />
                </Link>
                <a className={btn} href="#parcours">
                  Voir comment ça marche
                </a>
              </div>
              <p className="mt-[18px] font-mono text-[13px] tracking-[0.02em] text-muted">Tous les résumés de cours sont gratuits.</p>
            </div>

            {/* Aperçu produit */}
            <div className="relative min-w-0">
              <div
                className="relative min-w-0 rounded-[22px] border border-line bg-linear-to-br from-white/[.09] to-white/[.03] p-[18px] shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] backdrop-blur-xl md:[transform:perspective(1400px)_rotateY(-7deg)_rotateX(3deg)]"
                role="img"
                aria-label="Aperçu du tableau de bord : préparation à l'examen, progression par matière et révision du jour"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <i className="size-[9px] rounded-full bg-white/20" />
                    <i className="size-[9px] rounded-full bg-white/20" />
                    <i className="size-[9px] rounded-full bg-white/20" />
                  </div>
                  <span className={mono}>Aperçu · données d&apos;exemple</span>
                </div>

                <div className="flex items-center gap-[18px] rounded-2xl border border-line bg-black/35 p-4">
                  <div className="relative size-[104px] flex-none">
                    <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="9" />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#D4FF3D"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray="190 264"
                        style={{ filter: "drop-shadow(0 0 8px rgba(212,255,61,.6))" }}
                      />
                    </svg>
                    <div className="absolute inset-0 grid place-items-center text-[28px] font-semibold tracking-[-0.04em] tabular-nums">
                      <span>
                        72<small className="text-sm font-medium text-muted">%</small>
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">Prêt pour l&apos;examen</h4>
                    <p className="mt-1 text-[13.5px] leading-[1.45] text-muted">Ton niveau estimé d&apos;après tes réponses. Il monte à chaque séance.</p>
                  </div>
                </div>

                <div className="mt-3.5">
                  <SubjectRows />
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-3 rounded-[14px] bg-lime px-3.5 py-3 text-sm font-semibold text-lime-ink">
                  <span>Aujourd&apos;hui : 10 min sur Statistiques</span>
                  <small className="font-mono text-xs font-medium whitespace-nowrap opacity-70">5 questions</small>
                </div>
              </div>

              <div className="absolute -left-1.5 bottom-[62px] hidden items-center gap-2.5 rounded-[14px] border border-line bg-bg2/80 px-3.5 py-2.5 text-[13px] font-medium shadow-[0_18px_50px_-12px_rgba(0,0,0,.8)] backdrop-blur-md sm:flex sm:-left-[26px]">
                <Icon paths={ICONS.flame} size={18} stroke="#D4FF3D" sw={2.4} />
                <span>
                  <b className="font-semibold text-lime">5 jours</b> de suite
                </span>
              </div>
              <div className="absolute -top-[18px] -right-1 flex items-center gap-2.5 rounded-[14px] border border-line bg-bg2/80 px-3.5 py-2.5 text-[13px] font-medium shadow-[0_18px_50px_-12px_rgba(0,0,0,.8)] backdrop-blur-md sm:-right-3.5">
                <span className="size-2 rounded-full bg-ok shadow-[0_0_10px_var(--ok)]" />
                <span>
                  Bonne réponse <b className="font-semibold text-lime">+10 XP</b>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Résultats */}
        <section id="resultats" className="py-24">
          <div className={wrap}>
            <div className="mb-12 grid max-w-[760px] gap-4">
              <span className={mono}>Ce que tu obtiens</span>
              <h2 className={sectionTitle}>
                Moins de doute. <span className={serif}>Plus de points.</span>
              </h2>
              <p className="m-0 max-w-[34em] text-lg text-[#B7C2AB]">
                Tu n&apos;as plus à deviner quoi réviser ni à chercher la correction. Chaque séance te dit ce que tu sais et ce qu&apos;il reste à faire.
              </p>
            </div>

            <div className="grid grid-cols-6 gap-4">
              <article className={`${cell} col-span-6 md:col-span-4`}>
                <h3 className="text-[clamp(22px,2.4vw,30px)] leading-[1.08] font-semibold tracking-[-0.035em]">Tu sais où tu en es, avant l&apos;examen.</h3>
                <p className="m-0 max-w-[30em] text-muted">Chaque matière a son niveau. Les points faibles remontent en premier, pour que tu révises ce qui rapporte le plus.</p>
                <div className={mini}>
                  <SubjectRows />
                </div>
              </article>

              <article className={`${cellLime} col-span-6 md:col-span-2`}>
                <h3 className="text-[clamp(22px,2.4vw,30px)] leading-[1.08] font-semibold tracking-[-0.035em]">Tu gardes le rythme.</h3>
                <p className="m-0 max-w-[30em] text-lime-ink/70">Une série de jours, de l&apos;XP, un objectif court. Dix minutes par jour valent mieux qu&apos;une nuit blanche.</p>
                <div className="mt-auto rounded-2xl border border-lime-ink/20 bg-lime-ink/10 p-4">
                  <div className="font-mono text-xs uppercase tracking-[0.06em] text-lime-ink/70">Ta série</div>
                  <div className="mt-1.5 flex gap-2" aria-hidden="true">
                    <i className="h-11 flex-1 rounded-xl bg-lime-ink" />
                    <i className="h-11 flex-1 rounded-xl bg-lime-ink" />
                    <i className="h-11 flex-1 rounded-xl bg-lime-ink" />
                    <i className="h-11 flex-1 rounded-xl bg-lime-ink" />
                    <i className="h-11 flex-1 rounded-xl bg-lime-ink" />
                    <i className="h-11 flex-1 rounded-xl border-2 border-dashed border-lime-ink/50" />
                  </div>
                </div>
              </article>

              <article className={`${cell} col-span-6 md:col-span-2`}>
                <h3 className="text-[clamp(22px,2.4vw,30px)] leading-[1.08] font-semibold tracking-[-0.035em]">Tu comprends chaque erreur.</h3>
                <p className="m-0 max-w-[30em] text-muted">Après chaque réponse, tu vois pourquoi.</p>
                <div className={mini}>
                  <div className="text-[15px] font-semibold tracking-[-0.01em]">Un projet de loi vient de :</div>
                  <div className="mt-2 rounded-[11px] border border-bad/55 bg-bad/10 px-3 py-2.5 text-sm text-[#FFD2CB]">Le Parlement</div>
                  <div className="mt-2 rounded-[11px] border border-ok/60 bg-ok/10 px-3 py-2.5 text-sm text-[#CFF8D7]">Le Gouvernement</div>
                  <p className="m-0 mt-2.5 text-[13.5px] leading-normal text-[#C3CDB7]">
                    <b className="text-ok">Correction.</b> Le Gouvernement dépose un projet de loi, les parlementaires une proposition.
                  </p>
                </div>
              </article>

              <article className={`${cell} col-span-6 md:col-span-4`}>
                <h3 className="text-[clamp(22px,2.4vw,30px)] leading-[1.08] font-semibold tracking-[-0.035em]">Tu t&apos;entraînes comme le jour J.</h3>
                <p className="m-0 max-w-[30em] text-muted">Des examens blancs chronométrés, une correction à la fin et une note sur 20. Tu arrives en salle en connaissant le format.</p>
                <div className={mini}>
                  <div className="flex items-center justify-between">
                    <span className={mono}>Examen blanc · Section 1</span>
                    <span className="font-mono text-[34px] font-semibold tracking-[-0.04em] tabular-nums">24:18</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <i key={n} className="size-[22px] rounded-[7px] bg-lime" />
                    ))}
                    <i className="size-[22px] rounded-[7px] border-2 border-lime" />
                    {[0, 1, 2, 3].map((n) => (
                      <i key={n} className="size-[22px] rounded-[7px] bg-white/10" />
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Parcours */}
        <section id="parcours" className="pt-6 pb-24">
          <div className={wrap}>
            <div className="mb-12 grid max-w-[760px] gap-4">
              <span className={mono}>Le parcours</span>
              <h2 className={sectionTitle}>
                Du cours à la note, <span className={serif}>sans détour.</span>
              </h2>
              <p className="m-0 max-w-[34em] text-lg text-[#B7C2AB]">Le même enchaînement pour toutes les matières, en Bachelor 1 comme en Bachelor 2.</p>
            </div>

            <div className="relative grid gap-[26px] md:grid-cols-5 md:gap-3.5">
              <div className="pointer-events-none absolute top-9 right-[6%] left-[6%] hidden h-px bg-linear-to-r from-transparent via-lime to-transparent opacity-55 md:block" aria-hidden="true" />
              {FLOW.map((step) => (
                <div key={step.title} className="relative flex min-w-0 gap-[18px] md:flex-col md:gap-3">
                  <div
                    className={`relative z-[1] grid size-[72px] flex-none place-items-center rounded-[22px] border ${
                      step.hot ? "border-lime bg-lime text-lime-ink shadow-[0_0_40px_var(--glow)]" : "border-line bg-bg2/90 text-fg"
                    }`}
                  >
                    <Icon paths={step.icon} size={26} sw={step.hot ? 2.2 : 1.8} />
                  </div>
                  <div>
                    <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{step.title}</h3>
                    <p className="m-0 mt-1 text-[14.5px] text-muted">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Offre */}
        <section id="offre" className="pt-6 pb-24">
          <div className={wrap}>
            <div className="mb-12 grid max-w-[760px] gap-4">
              <span className={mono}>Offre</span>
              <h2 className={sectionTitle}>
                Les cours sont gratuits. <span className={serif}>Les extras</span> sont à toi.
              </h2>
              <p className="m-0 max-w-[34em] text-lg text-[#B7C2AB]">Tous les résumés restent gratuits. L&apos;abonnement ajoute de la pratique sans limite et des outils pour réussir.</p>
            </div>

            <div className="grid max-w-[1080px] gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`grid min-w-0 content-start gap-[18px] rounded-[28px] border p-[30px] ${
                    plan.featured
                      ? "border-lime bg-linear-to-br from-lime/[.12] to-lime/[.02] shadow-[0_0_80px_-30px_var(--glow)]"
                      : "border-line bg-white/5"
                  }`}
                >
                  <h3 className="text-2xl font-semibold tracking-[-0.035em]">{plan.name}</h3>
                  <div className="text-[46px] leading-none font-semibold tracking-[-0.05em]">
                    {plan.price} <small className="font-mono text-sm font-medium tracking-normal text-muted">{plan.unit}</small>
                  </div>
                  <ul className="m-0 grid list-none gap-2.5 p-0 text-[15.5px] text-[#C9D3BD]">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1 flex-none">
                          <Icon paths={ICONS.check} size={16} stroke="#D4FF3D" sw={3} />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link className={plan.featured ? btnLime : btn} href="/inscription">
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-[26px] flex flex-wrap items-center gap-2.5 text-sm text-muted">
              <span>Paiement par mobile money</span>
              <span className="rounded-full border border-line bg-white/5 px-3.5 py-2 font-medium text-fg">T-Money</span>
              <span className="rounded-full border border-line bg-white/5 px-3.5 py-2 font-medium text-fg">Moov Money</span>
            </div>
            <p className="mt-3.5 font-mono text-[13px] tracking-[0.02em] text-muted">Prix indicatifs, à confirmer avant l&apos;ouverture des paiements.</p>
          </div>
        </section>

        {/* Appel final */}
        <section className="pt-6 pb-24">
          <div className={wrap}>
            <div className="relative isolate overflow-hidden rounded-[36px] border border-line bg-bg2 px-[clamp(22px,5vw,64px)] py-[clamp(40px,8vw,96px)]">
              <Aurora base={0.55} a1={0.22} a2={0.08} f1={4} f2={9} spread={0.5} className="absolute inset-0 -z-10 h-full w-full" />
              <h2 className="max-w-[12em] text-[clamp(38px,6.4vw,84px)] leading-[.96] font-semibold tracking-[-0.035em] text-balance">
                La prochaine épreuve <span className={serif}>se prépare ici.</span>
              </h2>
              <p className="m-0 mt-5 max-w-[28em] text-lg text-[#C3CDB7]">Crée ton compte, choisis ton niveau et fais ta première séance de dix minutes.</p>
              <div className="mt-[30px] flex flex-wrap gap-3">
                <Link className={btnLime} href="/inscription">
                  Créer mon compte gratuit
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="pt-10 pb-14 text-sm text-muted">
        <div className={`${wrap} flex flex-wrap justify-between gap-x-7 gap-y-3 border-t border-line pt-[26px]`}>
          <span>{APP_NAME} · Plateforme de révision du Collège de Paris Lomé</span>
          <span>Mentions légales · Contact</span>
        </div>
      </footer>
    </>
  );
}