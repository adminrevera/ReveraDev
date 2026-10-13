"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateStudentLevel } from "@/app/actions/profile";

export default function ProfileLevelForm({
  levels,
  selectedLevelId,
}: {
  levels: { id: string; name: string; trackName: string; institutionName: string }[];
  selectedLevelId: string | null;
}) {
  const [levelId, setLevelId] = useState(selectedLevelId ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        const result = await updateStudentLevel(levelId);
        if (result.error) {
          setMessage(result.error);
          return;
        }
        setMessage("Ton niveau a été mis à jour.");
        router.refresh();
      } catch (error) {
        console.error("Student level update failed:", error);
        setMessage("Le niveau n’a pas pu être modifié. Réessaie.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
      <select className="min-h-11 rounded-xl border border-line bg-[#111611] px-3.5 text-sm text-fg" value={levelId} onChange={(event) => setLevelId(event.target.value)} required>
        <option value="" disabled>Choisir mon niveau</option>
        {levels.map((level) => <option key={level.id} value={level.id}>{level.name} · {level.trackName} · {level.institutionName}</option>)}
      </select>
      <button type="submit" disabled={pending || !levelId || levelId === selectedLevelId} className="inline-flex min-h-11 items-center justify-center rounded-full border border-accent/40 px-5 text-sm font-semibold disabled:opacity-50">{pending ? "Enregistrement…" : "Mettre à jour"}</button>
      {message && <p className="text-sm text-muted sm:col-span-2" role="status">{message}</p>}
    </form>
  );
}
