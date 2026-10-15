"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions/auth";
import FlowShell from "@/components/auth/FlowShell";
import Lumi from "@/components/brand/Lumi";

// Objectifs proposés (plusieurs choix possibles). Liste à valider avec l'équipe.
const goals = [
  { value: "exams", label: "Réussir mes examens", description: "Me préparer efficacement au jour J." },
  { value: "regularity", label: "Réviser régulièrement", description: "Installer une routine et garder le rythme." },
  { value: "confidence", label: "Gagner en confiance", description: "Mieux comprendre et voir mes progrès." },
  { value: "gaps", label: "Combler mes lacunes", description: "Reprendre ce que je n’ai pas compris." },
  { value: "ahead", label: "Prendre de l’avance", description: "Avancer avant que le cours ne démarre." },
  { value: "compete", label: "Me mesurer aux autres", description: "Grimper dans la ligue chaque semaine." },
];

type Level = { id: string; name: string; track: { name: string; institution: { name: string } } };

const inputClass =
  "min-h-14 w-full rounded-2xl border border-line bg-black/25 px-4 text-[16px] text-fg outline-none transition placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/15";
const selectClass =
  "min-h-14 w-full rounded-2xl border border-line bg-bg2 px-4 text-[16px] text-fg outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/15 disabled:opacity-50";
const primary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-5 text-[15px] font-semibold text-accent-ink shadow-[0_10px_40px_-10px_var(--glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";

export default function OnboardingForm({
  initialName,
  requestedPlan,
  levels,
}: {
  initialName: string;
  requestedPlan: "free" | "plus" | "success" | null;
  levels: Level[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(initialName);
  const [institution, setInstitution] = useState("");
  const [track, setTrack] = useState("");
  const [levelId, setLevelId] = useState("");
  const [chosenGoals, setChosenGoals] = useState<string[]>(["exams"]);
  const [pushOn, setPushOn] = useState(true);
  const [emailOn, setEmailOn] = useState(false);
  const [reminderTime, setReminderTime] = useState("18:00");
  const [first, setFirst] = useState<{ id: string | null; title: string | null }>({ id: null, title: null });
  const [errorMessage, setErrorMessage] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const institutions = useMemo(() => Array.from(new Set(levels.map((level) => level.track.institution.name))), [levels]);
  const tracks = useMemo(
    () => Array.from(new Set(levels.filter((level) => level.track.institution.name === institution).map((level) => level.track.name))),
    [levels, institution],
  );
  const levelOptions = useMemo(
    () => levels.filter((level) => level.track.institution.name === institution && level.track.name === track),
    [levels, institution, track],
  );

  function chooseInstitution(value: string) {
    setInstitution(value);
    setLevelId("");
    const nextTracks = Array.from(new Set(levels.filter((level) => level.track.institution.name === value).map((level) => level.track.name)));
    setTrack(nextTracks.length === 1 ? nextTracks[0] : "");
  }

  const hasLevels = levels.length > 0;
  const nameValid = displayName.trim().length >= 2 && displayName.trim().length <= 60;
  // L'inscription compte 5 écrans : méthode et identifiants (inscription), puis ces trois écrans.
  const total = 5;

  function back() {
    setErrorMessage("");
    setStep((current) => Math.max(1, current - 1));
  }

  function finish(skipReminders = false) {
    setErrorMessage("");
    startTransition(async () => {
      try {
        let push = skipReminders ? false : pushOn;
        if (push && typeof Notification !== "undefined" && Notification.permission === "default") {
          // La permission du navigateur est demandée au moment où l'on active les notifications.
          push = (await Notification.requestPermission().catch(() => "denied")) === "granted";
        } else if (push && typeof Notification !== "undefined" && Notification.permission === "denied") {
          push = false;
        }
        const result = await completeOnboarding(displayName, chosenGoals, requestedPlan, levelId || null, { push, email: skipReminders ? false : emailOn, time: reminderTime });
        if (result.error !== null) {
          setErrorMessage(result.error);
          return;
        }
        setFirst({ id: result.firstItemId, title: result.firstTitle });
        setDone(true);
      } catch (error) {
        console.error("Onboarding failed:", error);
        setErrorMessage("Impossible d’enregistrer ton profil. Réessaie.");
      }
    });
  }

  if (done) {
    const firstName = displayName.trim().split(/\s+/)[0];
    return (
      <main className="relative isolate flex min-h-svh flex-col items-center justify-center px-6 text-center">
        <div aria-hidden="true" className="halo pointer-events-none absolute inset-0 -z-10 opacity-75" />
        <div className="w-full max-w-[420px]">
          <div className="mx-auto mb-6 w-fit"><Lumi size={150} mood="contente" /></div>
          <h1 className="text-[clamp(30px,8vw,40px)] font-semibold leading-[1.1] tracking-[-0.04em]">
            Bienvenue, <span className="font-serif font-normal italic text-accent">{firstName}.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">Ton parcours est prêt. Lis un cours, puis valide-le avec le quiz pour débloquer la suite.</p>
          {first.title && <p className="mt-4 rounded-2xl border border-line bg-panel px-4 py-3 text-sm"><span className="block font-mono text-[10px] uppercase tracking-[.16em] text-amber">Ton premier cours</span><span className="mt-1 block font-medium">{first.title}</span></p>}
          <button
            type="button"
            className={`${primary} mt-8`}
            onClick={() => {
              router.replace(first.id ? `/parcours/${first.id}` : "/dashboard");
              router.refresh();
            }}
          >
            {first.id ? "Commencer le premier cours" : "C’est parti"}
          </button>
          {first.id && <button type="button" className="mt-3 text-sm text-muted underline underline-offset-4" onClick={() => { router.replace("/dashboard"); router.refresh(); }}>Aller à l’accueil</button>}
        </div>
      </main>
    );
  }

  const planNote = requestedPlan && requestedPlan !== "free" && step === 1 && (
    <p className="rounded-xl border border-accent/25 bg-accent/[.07] px-4 py-3 text-sm text-fg/90">
      Offre souhaitée : <strong>{requestedPlan === "plus" ? "Plus" : "Réussite"}</strong>. Cette préférence sera conservée dans ton compte.
    </p>
  );
  const error = errorMessage && (
    <p className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-[#FFD2CB]" role="alert">{errorMessage}</p>
  );

  const toggleGoal = (value: string) =>
    setChosenGoals((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]));
  const goNext = () => setStep(hasLevels ? 2 : 3);

  if (step === 1) {
    return (
      <FlowShell
        step={3}
        total={total}
        title="Comment doit-on t’appeler ?"
        subtitle="Ton prénom apparaît sur ton profil et dans la ligue (sous la forme « Prénom N. »)."
        footer={<button type="button" className={primary} disabled={!nameValid || chosenGoals.length === 0} onClick={goNext}>Continuer</button>}
      >
        {planNote}
        <div className="grid gap-2">
          <label htmlFor="onboarding-name" className="text-sm font-medium">Prénom ou nom</label>
          <input
            id="onboarding-name"
            name="displayName"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={60}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Ton prénom"
            className={inputClass}
          />
        </div>
        <fieldset className="mt-2">
          <legend className="text-sm font-medium">Quels sont tes objectifs ? <span className="font-normal text-muted">Plusieurs choix possibles</span></legend>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {goals.map((option) => {
              const on = chosenGoals.includes(option.value);
              return (
                <label key={option.value} className={`relative flex min-h-[104px] cursor-pointer flex-col justify-between rounded-2xl border p-3.5 transition ${on ? "border-accent bg-accent/[.10] shadow-[inset_0_0_0_1px_var(--accent)]" : "border-line bg-black/15 hover:border-accent/40"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleGoal(option.value)} className="sr-only" />
                  <span aria-hidden="true" className={`absolute right-3 top-3 grid size-5 place-items-center rounded-full border text-[11px] ${on ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent"}`}>✓</span>
                  <span className="pr-6 text-[14px] font-semibold leading-snug">{option.label}</span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-muted">{option.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </FlowShell>
    );
  }

  if (step === 2) {
    return (
      <FlowShell
        step={4}
        total={total}
        title="Où étudies-tu ?"
        subtitle="Pour te proposer les bonnes matières."
        onBack={back}
        footer={<button type="button" className={primary} disabled={!levelId} onClick={() => setStep(3)}>Continuer</button>}
      >
        <div className="grid gap-2">
          <label htmlFor="onboarding-institution" className="text-sm font-medium">Établissement</label>
          <select id="onboarding-institution" value={institution} onChange={(event) => chooseInstitution(event.target.value)} className={selectClass}>
            <option value="">Choisis ton établissement</option>
            {institutions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="onboarding-track" className="text-sm font-medium">Filière</label>
          <select id="onboarding-track" value={track} disabled={!institution} onChange={(event) => { setTrack(event.target.value); setLevelId(""); }} className={selectClass}>
            <option value="">Choisis ta filière</option>
            {tracks.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="onboarding-level" className="text-sm font-medium">Niveau</label>
          <select id="onboarding-level" value={levelId} disabled={!track} onChange={(event) => setLevelId(event.target.value)} className={selectClass}>
            <option value="">Choisis ton niveau</option>
            {levelOptions.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
          </select>
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell
      step={5}
      total={total}
      title="Veux-tu des rappels ?"
      subtitle="Pour garder ta série sans y penser."
      onBack={() => { setErrorMessage(""); setStep(hasLevels ? 2 : 1); }}
      footer={
        <>
          {error}
          <button type="button" className={primary} disabled={isPending} onClick={() => finish()}>{isPending ? "Enregistrement…" : "Terminer"}</button>
          <button type="button" className="text-center text-sm text-muted underline underline-offset-4" disabled={isPending} onClick={() => finish(true)}>Plus tard</button>
        </>
      }
    >
      {[
        { label: "Notifications sur cet appareil", on: pushOn, set: setPushOn },
        { label: "Rappels par e-mail", on: emailOn, set: setEmailOn },
      ].map((row) => (
        <button key={row.label} type="button" role="switch" aria-checked={row.on} onClick={() => row.set(!row.on)} className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-[15px] font-medium transition ${row.on ? "border-accent bg-accent/[.08]" : "border-line bg-black/15"}`}>
          {row.label}
          <span aria-hidden="true" className={`relative h-6 w-11 rounded-full border transition ${row.on ? "border-accent bg-accent" : "border-line bg-bg2"}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-fg transition-all ${row.on ? "left-[22px] !bg-accent-ink" : "left-0.5"}`} />
          </span>
        </button>
      ))}
      <label className="flex min-h-14 items-center justify-between rounded-2xl border border-line bg-black/15 px-4 text-[15px] font-medium">
        Heure du rappel
        <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} className="rounded-lg border border-line bg-bg2 px-2 py-1 text-[15px]" />
      </label>
      <p className="text-xs leading-relaxed text-muted">Fuseau Africa/Lome par défaut. Tout se change plus tard dans ton profil. Le navigateur te demandera ton accord pour les notifications.</p>
    </FlowShell>
  );
}
