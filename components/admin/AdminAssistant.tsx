"use client";

import { useState } from "react";
import { adminButton, adminInput } from "./AdminShell";

type Mode = "ask" | "manual" | "auto";
type Proposal = { name: string; input: Record<string, unknown>; summary: string; state?: "applied" | "failed" };
type Entry = { role: "user" | "assistant"; text: string; proposals?: Proposal[]; executed?: { summary: string; ok: boolean }[] };

const modes: [Mode, string, string][] = [
  ["ask", "Demander", "Lecture seule : l’assistant répond, il ne modifie rien."],
  ["manual", "Action · manuel", "L’assistant propose des actions, tu cliques pour les appliquer."],
  ["auto", "Action · auto", "L’assistant exécute lui-même (journalisé). Il ne publie jamais."],
];
const suggestions = ["Où en est-on ? Résumé de l’état de la plateforme.", "Quelles matières n’ont aucun chapitre publié ?", "Complète les formats de questions manquants de la première matière.", "Ajoute 5 quêtes variées à la réserve."];

export default function AdminAssistant() {
  const [mode, setMode] = useState<Mode>("ask");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(value: string) {
    const content = value.trim();
    if (!content || busy) return;
    setError(""); setBusy(true); setText("");
    const next: Entry[] = [...entries, { role: "user", text: content }];
    setEntries(next);
    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, messages: next.map((entry) => ({ role: entry.role, content: entry.text })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erreur.");
      setEntries([...next, { role: "assistant", text: data.reply, proposals: data.proposals, executed: data.executed }]);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur."); } finally { setBusy(false); }
  }

  async function apply(entryIndex: number, proposalIndex: number) {
    const proposal = entries[entryIndex].proposals?.[proposalIndex];
    if (!proposal) return;
    const response = await fetch("/api/admin/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apply: { name: proposal.name, input: proposal.input } }) });
    const ok = response.ok;
    setEntries((current) => current.map((entry, i) => i !== entryIndex ? entry : { ...entry, proposals: entry.proposals?.map((p, j) => j === proposalIndex ? { ...p, state: ok ? "applied" : "failed" } : p) }));
  }

  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label="Mode de l’assistant" className="grid gap-2 sm:grid-cols-3">
        {modes.map(([id, label, help]) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
            className={`rounded-xl border p-3 text-left text-sm ${mode === id ? "border-accent/60 bg-accent/[.10]" : "border-line"}`}>
            <b className="block">{label}</b><span className="text-xs text-muted">{help}</span>
          </button>
        ))}
      </div>
      <div className="min-h-[280px] rounded-2xl border border-line bg-bg2/50 p-4" aria-live="polite">
        {entries.length === 0 && (
          <div className="grid gap-2">
            <p className="text-sm text-muted">Essaie :</p>
            {suggestions.map((suggestion) => <button key={suggestion} type="button" className="rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-accent/50" onClick={() => void send(suggestion)}>{suggestion}</button>)}
          </div>
        )}
        <div className="grid gap-3">
          {entries.map((entry, index) => (
            <div key={index} className={entry.role === "user" ? "justify-self-end rounded-2xl bg-accent/[.12] px-4 py-2.5 text-sm" : "max-w-3xl text-sm leading-relaxed"}>
              <p className="whitespace-pre-wrap">{entry.text}</p>
              {entry.executed?.map((action, i) => <p key={i} className={`mt-2 text-xs ${action.ok ? "text-accent" : "text-red-300"}`}>{action.ok ? "Exécuté" : "Échec"} : {action.summary}</p>)}
              {entry.proposals?.map((proposal, i) => (
                <div key={i} className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
                  <span className="min-w-0 flex-1 text-xs">{proposal.summary}</span>
                  {proposal.state === "applied" ? <span className="text-xs text-accent">Appliqué</span> : proposal.state === "failed" ? <span className="text-xs text-red-300">Échec</span> : <button type="button" className={adminButton} onClick={() => void apply(index, i)}>Appliquer</button>}
                </div>
              ))}
            </div>
          ))}
          {busy && <p className="text-xs text-muted">L’assistant réfléchit…</p>}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send(text); }}>
        <input className={adminInput} value={text} onChange={(event) => setText(event.target.value)} placeholder="Écris à l’assistant…" aria-label="Message" maxLength={2000} />
        <button className={adminButton} disabled={busy || !text.trim()}>Envoyer</button>
      </form>
    </div>
  );
}
