"use client";

import { useState, useTransition } from "react";
import { getVersionPreview, sendBackToDraft, type PreviewQuestion } from "@/app/admin/studio-actions";
import { adminButton, adminInput } from "./AdminShell";

type Preview = Awaited<ReturnType<typeof getVersionPreview>>;
const formatNames: Record<string, string> = {
  MCQ: "QCM", TRUE_FALSE: "Vrai ou faux", GAP: "Texte à trous", MATCHING: "Association", DRAG: "Glisser", SWIPE: "Swipe",
};

/** Aperçu d'une version tel que l'étudiant la verra : parties du cours (comme la lecture guidée) + questions avec le corrigé. */
export default function VersionPreview({ versionId }: { versionId: string }) {
  const [data, setData] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"student" | "questions">("student");
  const [partIndex, setPartIndex] = useState(0);
  const [full, setFull] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState("");
  const [pending, start] = useTransition();

  async function load() {
    if (data) return;
    try { setData(await getVersionPreview(versionId)); } catch { setError("Impossible de charger l’aperçu."); }
  }

  const formats = data ? Array.from(new Set(data.questions.map((question) => question.type))) : [];
  const missing = data ? ["MCQ", "GAP", "DRAG", "TRUE_FALSE", "MATCHING", "SWIPE"].filter((format) => !formats.includes(format)) : [];

  return (
    <details className="mt-3 rounded-xl border border-line bg-bg/40" onToggle={(event) => { if (event.currentTarget.open) void load(); }}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Voir comme l’étudiant</summary>
      <div className="border-t border-line p-4">
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {!data && !error && <p className="text-sm text-muted">Chargement…</p>}
        {data && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(["student", "questions"] as const).map((id) => (
                <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
                  className={`rounded-full border px-3.5 py-2 text-xs ${tab === id ? "border-accent/50 bg-accent/[.12] font-semibold" : "border-line text-muted"}`}>
                  {id === "student" ? `Cours (${data.parts.length} parties)` : `Questions (${data.questions.length})`}
                </button>
              ))}
              {data.questions.some((question) => !question.valid) && <span className="text-xs text-amber">Certaines questions sont incomplètes.</span>}
            </div>

            {tab === "student" && (
              <div className="rounded-xl border border-line bg-bg2/60 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>{full ? "Cours entier (relecture après validation)" : `Partie ${Math.min(partIndex + 1, data.parts.length)} sur ${data.parts.length} (première lecture)`}</span>
                  <button type="button" className="underline" onClick={() => setFull((value) => !value)}>{full ? "Afficher par parties" : "Afficher tout le cours"}</button>
                </div>
                <h3 className="text-xl font-semibold">{data.title}</h3>
                {data.subtitle && <p className="mt-1 text-sm text-muted">{data.subtitle}</p>}
                {data.parts.length === 0 && <p className="mt-3 text-sm text-muted">Cette version n’a pas de texte.</p>}
                {(full ? data.parts : data.parts.slice(partIndex, partIndex + 1)).map((part, index) => (
                  <div key={index} className="course-content mt-4" dangerouslySetInnerHTML={{ __html: part.html }} />
                ))}
                {!full && data.parts.length > 1 && (
                  <div className="mt-4 flex gap-2">
                    <button type="button" className={adminButton} disabled={partIndex === 0} onClick={() => setPartIndex((value) => Math.max(0, value - 1))}>Précédent</button>
                    <button type="button" className={adminButton} disabled={partIndex >= data.parts.length - 1} onClick={() => setPartIndex((value) => value + 1)}>Continuer</button>
                  </div>
                )}
              </div>
            )}

            {tab === "questions" && (
              <div className="grid gap-3">
                <p className="text-xs text-muted">Formats présents : {formats.map((format) => formatNames[format] ?? format).join(", ") || "aucun"}.{missing.length > 0 && ` Manquants : ${missing.map((format) => formatNames[format]).join(", ")}.`}</p>
                {data.questions.map((question: PreviewQuestion) => (
                  <article key={question.key} className={`rounded-xl border p-3 text-sm ${question.valid ? "border-line" : "border-amber/40"}`}>
                    <p className="text-[11px] uppercase tracking-wide text-amber">{formatNames[question.type] ?? question.type}{!question.valid && " · incomplète"}</p>
                    <p className="mt-1">{question.text}</p>
                    {question.answerKey.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-muted">
                        {question.answerKey.map((line, index) => <li key={index}>{line}</li>)}
                      </ul>
                    )}
                  </article>
                ))}
                {data.questions.length === 0 && <p className="text-sm text-muted">Aucune question.</p>}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <input className={`${adminInput} sm:max-w-sm`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Raison du renvoi en brouillon" aria-label="Raison du renvoi" />
              <button type="button" className={adminButton} disabled={pending || reason.trim().length < 3}
                onClick={() => start(async () => { try { await sendBackToDraft(versionId, reason); setDone("Renvoyée en brouillon."); } catch (e) { setError(e instanceof Error ? e.message : "Échec."); } })}>
                Renvoyer en brouillon
              </button>
              {done && <span className="text-xs text-accent">{done}</span>}
            </div>
          </>
        )}
      </div>
    </details>
  );
}
