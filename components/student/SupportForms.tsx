"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupportTicket, replySupportTicket } from "@/app/actions/community";

const field = "min-h-12 w-full rounded-2xl border border-line bg-panel px-4 text-[15px] outline-none transition focus:border-accent/70";
const button = "inline-flex min-h-12 items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50";

export function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await createSupportTicket(subject, message);
          if (result.error !== null) { setError(result.error); return; }
          router.push(`/aide/${result.ticketId}`);
        });
      }}
    >
      <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="Sujet de ta demande" aria-label="Sujet" className={field} />
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={3000} rows={5} placeholder="Explique ce qui se passe, avec le plus de détails possible" aria-label="Message" className={`${field} py-3`} />
      {error && <p className="text-sm text-warn" role="alert">{error}</p>}
      <button type="submit" disabled={pending} className={button}>{pending ? "Envoi…" : "Envoyer au support"}</button>
    </form>
  );
}

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await replySupportTicket(ticketId, body);
          if (result.error) { setError(result.error); return; }
          setBody("");
          setError(null);
          router.refresh();
        });
      }}
    >
      <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={3000} rows={3} placeholder="Ta réponse" aria-label="Ta réponse" className={`${field} py-3`} />
      {error && <p className="text-sm text-warn" role="alert">{error}</p>}
      <button type="submit" disabled={pending || !body.trim()} className={button}>{pending ? "Envoi…" : "Répondre"}</button>
    </form>
  );
}
