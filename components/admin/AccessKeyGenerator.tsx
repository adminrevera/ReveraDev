"use client";

import { useState, useTransition, type FormEvent } from "react";
import { generateAccessKey } from "@/app/admin/actions";
import { adminButton, adminInput } from "@/components/admin/AdminShell";

export default function AccessKeyGenerator({ plans }: { plans: { id: string; name: string }[] }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setCode("");
    setError("");
    startTransition(async () => {
      try {
        const result = await generateAccessKey(formData);
        setCode(result.code);
        form.reset();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "La clé n’a pas pu être créée.");
      }
    });
  }

  return (
    <>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <select className={adminInput} name="planId" required defaultValue="">
          <option value="" disabled>Choisir une offre</option>
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </select>
        <input className={adminInput} name="batch" maxLength={80} placeholder="Lot (facultatif)" />
        <button className={adminButton} disabled={pending}>{pending ? "Création…" : "Générer"}</button>
      </form>
      {code && <p className="mt-3 break-all rounded-xl border border-accent/30 bg-accent/[.07] p-3 text-sm" role="status">Code à transmettre (il ne sera plus affiché) : <b className="font-mono">{code}</b></p>}
      {error && <p className="mt-3 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
    </>
  );
}
