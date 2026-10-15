"use client";

import { useState, useTransition } from "react";
import { installCatalog, runLeagueRollover, setQuestActive, updateBadgeDetails, updateNumberSetting } from "@/app/admin/studio-actions";
import { adminButton, adminInput } from "./AdminShell";

export function QuestToggle({ id, active }: { id: string; active: boolean }) {
  const [value, setValue] = useState(active);
  const [pending, start] = useTransition();
  return (
    <button type="button" role="switch" aria-checked={value} disabled={pending} aria-label={value ? "Désactiver la quête" : "Activer la quête"}
      onClick={() => start(async () => { const next = !value; await setQuestActive(id, next); setValue(next); })}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${value ? "border-accent/60 bg-accent/30" : "border-line bg-bg2"}`}>
      <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-fg transition-all ${value ? "left-[22px]" : "left-0.5"}`} style={{ height: 18, width: 18 }} />
    </button>
  );
}

export function NumberSetting({ settingKey, label, value, min, max }: { settingKey: "quests.perDay" | "league.unlockAfterChapters"; label: string; value: number; min: number; max: number }) {
  const [current, setCurrent] = useState(String(value));
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs text-muted">{label}
        <input className={`${adminInput} w-28`} type="number" min={min} max={max} value={current} onChange={(event) => setCurrent(event.target.value)} />
      </label>
      <button type="button" className={adminButton} disabled={pending}
        onClick={() => start(async () => { try { await updateNumberSetting(settingKey, Number(current)); setMessage("Enregistré."); } catch (error) { setMessage(error instanceof Error ? error.message : "Échec."); } })}>Enregistrer</button>
      {message && <span role="status" className="text-xs text-muted">{message}</span>}
    </div>
  );
}

export function ActionButton({ kind }: { kind: "catalog" | "rollover" }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={adminButton} disabled={pending}
        onClick={() => start(async () => {
          try {
            if (kind === "catalog") { const result = await installCatalog(); setMessage(`${result.badges} badge(s) et ${result.quests} quête(s) ajoutés.`); }
            else { await runLeagueRollover(); setMessage("Semaine de ligue clôturée si nécessaire."); }
          } catch (error) { setMessage(error instanceof Error ? error.message : "Échec."); }
        })}>
        {pending ? "En cours…" : kind === "catalog" ? "Installer le catalogue (badges + quêtes)" : "Clôturer la semaine de ligue"}
      </button>
      {message && <span role="status" className="text-xs text-muted">{message}</span>}
    </span>
  );
}

export function BadgeEditor({ id, name, description }: { id: string; name: string; description: string }) {
  const [n, setN] = useState(name);
  const [d, setD] = useState(description);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-center">
      <input className={adminInput} value={n} onChange={(event) => setN(event.target.value)} aria-label="Nom du badge" />
      <input className={adminInput} value={d} onChange={(event) => setD(event.target.value)} aria-label="Description du badge" />
      <button type="button" className={adminButton} disabled={pending || (n === name && d === description)}
        onClick={() => start(async () => { try { await updateBadgeDetails(id, { name: n, description: d }); setMessage("OK"); } catch { setMessage("Échec"); } })}>
        {message || "Enregistrer"}
      </button>
    </div>
  );
}
