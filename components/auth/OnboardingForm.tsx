"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions/auth";
import FlowShell from "@/components/auth/FlowShell";
import Lumi from "@/components/brand/Lumi";

const goals = [
  { value: "exams", label: "Réussir mes examens", description: "Me préparer efficacement au jour J." },
  { value: "regularity", label: "Réviser régulièrement", description: "Installer une routine et garder le rythme." },
  { value: "confidence", label: "Gagner en confiance", description: "Mieux comprendre et voir mes progrès." },
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
  const [goal, setGoal] = useState("exams");
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

  function finish() {
    setErrorMessage("");
    startTransition(async () => {
      try {
        const result = await completeOnboarding(displayName, goal, requestedPlan, levelId || null);
        if (result.error) {
          setErrorMessage(result.error);
          return;
        }
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
          <p className="mt-3 text-sm leading-relaxed text-muted">Ton parcours est prêt. On commence par ton premier chapitre.</p>
          <button
            type="button"
            className={`${primary} mt-8`}
            onClick={() => {
              router.replace("/dashboard");
              router.refresh();
            }}
          >
            C’est parti
          </button>
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

  if (step === 1) {
    return (
      <FlowShell
        step={3}
        total={total}
        title="Comment doit-on t’appeler ?"
        subtitle="Ton prénom apparaît sur ton profil et dans la ligue."
        footer={<button type="button" className={primary} disabled={!nameValid} onClick={() => setStep(hasLevels ? 2 : 3)}>Continuer</button>}
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
            onKeyDown={(event) => { if (event.key === "Enter" && nameValid) setStep(hasLevels ? 2 : 3); }}
            placeholder="Ton prénom"
            className={inputClass}
          />
        </div>
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
      title="Quel est ton objectif principal ?"
      subtitle="Tu pourras en changer plus tard."
      onBack={() => { setErrorMessage(""); setStep(hasLevels ? 2 : 1); }}
      footer={
        <>
          {error}
          <button type="button" className={primary} disabled={isPending} onClick={finish}>{isPending ? "Enregistrement…" : "Terminer"}</button>
        </>
      }
    >
      <fieldset className="grid gap-3">
        <legend className="sr-only">Objectif principal</legend>
        {goals.map((option) => (
          <label key={option.value} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${goal === option.value ? "border-accent bg-accent/[.10] shadow-[inset_0_0_0_1px_var(--accent)]" : "border-line bg-black/15 hover:border-accent/40"}`}>
            <input type="radio" name="goal" value={option.value} checked={goal === option.value} onChange={() => setGoal(option.value)} className="mt-1 accent-accent" />
            <span>
              <span className="block text-[15px] font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </FlowShell>
  );
}
