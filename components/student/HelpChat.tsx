"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { fetchHelpMessages, postHelpMessage } from "@/app/actions/community";

type Message = { id: string; body: string; at: string; mine: boolean; author: string };

export default function HelpChat({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result = await fetchHelpMessages(groupId);
    if (result.error === null) setMessages(result.messages);
    else setError(result.error);
  }, [groupId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "auto", block: "end" }); }, [messages.length]);

  function send() {
    const body = value.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await postHelpMessage(groupId, body);
      if (result.error) { setError(result.error); return; }
      setValue("");
      setError(null);
      await load();
    });
  }

  return (
    <div className="grid gap-3">
      <div className="grid max-h-[55vh] min-h-64 gap-2 overflow-y-auto rounded-2xl border border-line bg-panel p-4" aria-live="polite">
        {messages.length === 0 && <p className="m-auto text-sm text-muted">Aucun message pour l’instant. Pose la première question.</p>}
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.mine ? "ml-auto bg-accent/[.14]" : "bg-bg2"}`}>
            {!message.mine && <p className="mb-0.5 text-[11px] font-semibold text-amber">{message.author}</p>}
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <p className="mt-1 text-[10px] text-muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.at))}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <p className="text-sm text-warn" role="alert">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex gap-2">
        <input value={value} onChange={(event) => setValue(event.target.value)} maxLength={1000} placeholder="Écris ton message" aria-label="Ton message" className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-panel px-5 text-[15px] outline-none focus:border-accent/70" />
        <button type="submit" disabled={pending || !value.trim()} className="inline-flex min-h-12 items-center rounded-full border border-accent bg-accent px-6 text-sm font-semibold text-accent-ink disabled:opacity-50">Envoyer</button>
      </form>
    </div>
  );
}
