"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { previewCourse, saveChapterVersion } from "@/app/admin/studio-actions";
import DeriveButton from "./DeriveButton";
import { adminButton, adminInput } from "./AdminShell";

const templates: Record<string, string> = {
  MCQ: `{ "key": "q-nouvelle-1", "type": "MCQ", "text": "Question ?", "data": { "options": [ { "text": "Bonne réponse", "correct": true }, { "text": "Mauvaise 1", "correct": false }, { "text": "Mauvaise 2", "correct": false } ] }, "explanation": "Pourquoi." }`,
  TRUE_FALSE: `{ "key": "q-nouvelle-2", "type": "TRUE_FALSE", "text": "Affirmation.", "data": { "options": [ { "text": "Vrai", "correct": true }, { "text": "Faux", "correct": false } ] } }`,
  GAP: `{ "key": "q-nouvelle-3", "type": "GAP", "text": "Complète : « Le ____ est… »", "data": { "answers": ["mot"], "hint": "indice" } }`,
  MATCHING: `{ "key": "q-nouvelle-4", "type": "MATCHING", "text": "Associe.", "data": { "pairs": [ { "term": "A", "example": "a" }, { "term": "B", "example": "b" }, { "term": "C", "example": "c" } ] } }`,
  DRAG: `{ "key": "q-nouvelle-5", "type": "DRAG", "text": "Glisse chaque terme.", "data": { "slots": ["Définition 1", "Définition 2"], "bank": ["Terme 1", "Terme 2", "Intrus"], "answer": [0, 1] } }`,
  SWIPE: `{ "key": "q-nouvelle-6", "type": "SWIPE", "text": "Vrai ou faux ?", "data": { "cards": [ { "text": "Affirmation vraie", "answer": true }, { "text": "Affirmation fausse", "answer": false } ], "rightLabel": "Vrai", "leftLabel": "Faux" } }`,
};

type Part = { title: string | null; html: string };

export default function ChapterEditor(props: {
  itemId: string; subject: string; number: number; version: number; status: string;
  title: string; subtitle: string; bodyHtml: string; formats: string[];
}) {
  const [title, setTitle] = useState(props.title);
  const [subtitle, setSubtitle] = useState(props.subtitle);
  const [body, setBody] = useState(props.bodyHtml);
  const [note, setNote] = useState("");
  const [extras, setExtras] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [partIndex, setPartIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aperçu en direct (rendu serveur, nettoyé comme chez l'étudiant), avec un léger délai pour rester fluide.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      previewCourse(body).then((result) => setParts(result.parts)).catch(() => undefined);
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [body]);

  function addTemplate(format: string) {
    const entry = templates[format];
    setExtras((current) => {
      const trimmed = current.trim();
      if (!trimmed) return `[\n${entry}\n]`;
      return trimmed.replace(/\]\s*$/, `,\n${entry}\n]`);
    });
  }

  function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) { setMessage("Fichier trop volumineux (400 Ko max)."); return; }
    const reader = new FileReader();
    reader.onload = () => setBody(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function save() {
    setMessage("");
    start(async () => {
      try {
        const result = await saveChapterVersion({ itemId: props.itemId, title, subtitle, bodyHtml: body, note, extraQuestionsJson: extras });
        setMessage(`Version ${result.version} créée et envoyée en relecture.`);
        setNote("");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Échec de l’enregistrement."); }
    });
  }

  const current = parts[Math.min(partIndex, Math.max(parts.length - 1, 0))];
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="grid content-start gap-3">
        <p className="text-xs text-muted">{props.subject} · chapitre {props.number} · version actuelle v{props.version} ({props.status}) · formats : {props.formats.join(", ") || "aucun"}</p>
        <input className={adminInput} value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Titre" />
        <input className={adminInput} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Sous-titre (facultatif)" aria-label="Sous-titre" />
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${adminButton} cursor-pointer`}>
            Importer un fichier HTML
            <input type="file" accept=".html,.htm,.txt" className="sr-only" onChange={(event) => importFile(event.target.files?.[0])} />
          </label>
          <DeriveButton itemId={props.itemId} />
        </div>
        <textarea className={`${adminInput} min-h-[320px] py-3 font-mono text-xs`} value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} aria-label="Texte du cours (HTML)" />
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium">Ajouter des questions (JSON)</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(templates).map((format) => <button key={format} type="button" className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-fg" onClick={() => addTemplate(format)}>+ {format}</button>)}
          </div>
          <textarea className={`${adminInput} mt-3 min-h-[160px] py-3 font-mono text-xs`} value={extras} onChange={(event) => setExtras(event.target.value)} placeholder="[ { … } ]" spellCheck={false} aria-label="Questions supplémentaires (JSON)" />
        </details>
        <input className={adminInput} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ce qui change (obligatoire)" aria-label="Ce qui change" />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={adminButton} disabled={pending || note.trim().length < 3 || title.trim().length < 2} onClick={save}>{pending ? "Enregistrement…" : "Enregistrer en relecture"}</button>
          {message && <span role="status" className="text-xs text-muted">{message}</span>}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-bg2/60 p-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-auto">
        <p className="mb-3 text-xs uppercase tracking-wide text-amber">Aperçu étudiant · partie {parts.length ? Math.min(partIndex + 1, parts.length) : 0}/{parts.length}</p>
        <h3 className="text-xl font-semibold">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        {current && <div className="course-content mt-4" dangerouslySetInnerHTML={{ __html: current.html }} />}
        {parts.length > 1 && (
          <div className="mt-4 flex gap-2">
            <button type="button" className={adminButton} disabled={partIndex === 0} onClick={() => setPartIndex((value) => Math.max(0, value - 1))}>Précédent</button>
            <button type="button" className={adminButton} disabled={partIndex >= parts.length - 1} onClick={() => setPartIndex((value) => value + 1)}>Continuer</button>
          </div>
        )}
      </div>
    </div>
  );
}
