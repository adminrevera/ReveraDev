"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { completeOnboarding } from "@/app/actions/auth";

const goals = [
  { value: "exams", label: "Réussir mes examens", description: "Me préparer efficacement au jour J." },
  { value: "regularity", label: "Réviser régulièrement", description: "Installer une routine et garder le rythme." },
  { value: "confidence", label: "Gagner en confiance", description: "Mieux comprendre et voir mes progrès." },
];

export default function OnboardingForm({
  initialName,
  requestedPlan,
  levels,
}: {
  initialName: string;
  requestedPlan: "free" | "plus" | "success" | null;
  levels: { id: string; name: string; track: { name: string; institution: { name: string } } }[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName);
  const [goal, setGoal] = useState("exams");
  const [levelId, setLevelId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!event.currentTarget.reportValidity()) return;

    startTransition(async () => {
      const result = await completeOnboarding(displayName, goal, requestedPlan, levelId || null);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
      {requestedPlan && requestedPlan !== "free" && (
        <p className="rounded-xl border border-accent/25 bg-accent/[.07] px-4 py-3 text-sm text-fg/90">
          Offre souhaitée : <strong>{requestedPlan === "plus" ? "Plus" : "Réussite"}</strong>.
          Cette préférence sera conservée dans ton compte.
        </p>
      )}
      <div className="grid gap-2">
        <label htmlFor="onboarding-name" className="text-sm font-medium">
          Comment t’appelles-tu?
        </label>
        <input
          id="onboarding-name"
          name="displayName"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={60}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Ton prénom"
          className="min-h-12 rounded-xl border border-line bg-black/25 px-4 text-[15px] text-fg outline-none transition placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/15"
        />
      </div>

      {levels.length > 0 && (
        <div className="grid gap-2">
          <label htmlFor="onboarding-level" className="text-sm font-medium">
            Quel est ton parcours d’études?
          </label>
          <select
            id="onboarding-level"
            name="levelId"
            required
            value={levelId}
            onChange={(event) => setLevelId(event.target.value)}
            className="min-h-12 rounded-xl border border-line bg-[#111611] px-4 text-[15px] text-fg outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/15"
          >
            <option value="">Sélectionne ton niveau</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name} · {level.track.name} · {level.track.institution.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset className="grid gap-2.5">
        <legend className="mb-1 text-sm font-medium">Quel est ton objectif principal?</legend>
        {goals.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
              goal === option.value
                ? "border-accent/60 bg-accent/[.07]"
                : "border-line bg-black/15 hover:border-accent/30"
            }`}
          >
            <input
              type="radio"
              name="goal"
              value={option.value}
              checked={goal === option.value}
              onChange={() => setGoal(option.value)}
              className="mt-1 accent-accent"
            />
            <span>
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {errorMessage && (
        <p className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-[#FFD2CB]" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-accent bg-accent px-5 text-[15px] font-semibold text-accent-ink shadow-[0_10px_40px_-10px_var(--glow)] transition hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Enregistrement…" : "Continuer vers mon espace"}
      </button>
    </form>
  );
}
