"use client";

import { useRef, useState } from "react";
import type { AnswerValue, PresentedQuestion } from "@/lib/questions";

export const formatLabels: Record<PresentedQuestion["type"], string> = {
  MCQ: "QCM",
  TRUE_FALSE: "Vrai ou faux",
  GAP: "Texte à trous",
  MATCHING: "Association",
  DRAG: "Glisser",
  SWIPE: "Swipe",
};

export function isAnswered(question: PresentedQuestion, answer: AnswerValue | undefined) {
  switch (question.type) {
    case "MCQ":
    case "TRUE_FALSE": return typeof answer === "number";
    case "GAP": return typeof answer === "string" && answer.trim().length > 0;
    case "MATCHING":
      return Array.isArray(answer) && answer.length === question.terms.length && new Set(answer).size === answer.length && answer.every((i) => i >= 0 && i < question.examples.length);
    case "DRAG":
      return Array.isArray(answer) && answer.length === question.slots.length && new Set(answer).size === answer.length && answer.every((i) => i >= 0 && i < question.bank.length);
    case "SWIPE":
      return Array.isArray(answer) && answer.length === question.cards.length && answer.every((i) => i === 0 || i === 1);
  }
}

const choiceBase = "flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-[15px] transition";
const on = "border-accent bg-accent/[.10] shadow-[inset_0_0_0_1px_var(--accent)]";
const off = "border-line bg-panel hover:border-accent/40";

export default function QuestionView({ question, answer, onChange }: { question: PresentedQuestion; answer: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) {
  if (question.type === "MCQ") {
    return (
      <div className="grid gap-3">
        {question.choices.map((choice, i) => (
          <label key={`${i}-${choice}`} className={`${choiceBase} ${answer === i ? on : off}`}>
            <input type="radio" name={`q-${question.id}`} checked={answer === i} onChange={() => onChange(i)} className="sr-only" />
            <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg border text-sm font-semibold ${answer === i ? "border-accent bg-accent text-accent-ink" : "border-line text-muted"}`}>{String.fromCharCode(65 + i)}</span>
            <span className="leading-snug">{choice}</span>
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "TRUE_FALSE") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {question.choices.map((choice, i) => (
          <label key={`${i}-${choice}`} className={`flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border p-4 text-lg font-semibold transition ${answer === i ? on : off}`}>
            <input type="radio" name={`q-${question.id}`} checked={answer === i} onChange={() => onChange(i)} className="sr-only" />
            {choice}
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "GAP") {
    return (
      <input
        type="text" autoComplete="off" autoCapitalize="none" maxLength={500} aria-label="Ta réponse"
        value={typeof answer === "string" ? answer : ""} onChange={(event) => onChange(event.target.value)}
        className="min-h-14 w-full rounded-2xl border border-line bg-panel px-4 text-[16px] text-fg outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/15"
        placeholder={question.hint ? `Indice : ${question.hint}` : "Saisis ta réponse"}
      />
    );
  }
  if (question.type === "MATCHING") {
    return (
      <div className="grid gap-3">
        {question.terms.map((term, termIndex) => {
          const value = Array.isArray(answer) ? answer[termIndex] : undefined;
          return (
            <label key={`${termIndex}-${term}`} className="grid gap-2 rounded-2xl border border-line bg-panel p-4 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
              <span className="font-medium">{term}</span>
              <select
                value={value === undefined || value < 0 ? "" : String(value)}
                onChange={(event) => {
                  const next = Array.isArray(answer) ? [...answer] : (Array(question.terms.length).fill(-1) as number[]);
                  next[termIndex] = event.target.value === "" ? -1 : Number(event.target.value);
                  onChange(next);
                }}
                className="min-h-12 min-w-0 rounded-xl border border-line bg-bg2 px-3 text-fg"
              >
                <option value="">Choisir un exemple</option>
                {question.examples.map((example, exampleIndex) => <option key={`${exampleIndex}-${example}`} value={exampleIndex}>{example}</option>)}
              </select>
            </label>
          );
        })}
      </div>
    );
  }
  if (question.type === "DRAG") return <DragBoard question={question} answer={answer} onChange={onChange} />;
  return <SwipeDeck question={question} answer={answer} onChange={onChange} />;
}

function DragBoard({ question, answer, onChange }: { question: Extract<PresentedQuestion, { type: "DRAG" }>; answer: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) {
  const slots = Array.isArray(answer) && answer.length === question.slots.length ? answer : (Array(question.slots.length).fill(-1) as number[]);
  const [picked, setPicked] = useState<number | null>(null);
  const used = new Set(slots.filter((index) => index >= 0));

  function place(slotIndex: number, bankIndex: number) {
    const next = slots.map((value) => (value === bankIndex ? -1 : value));
    next[slotIndex] = bankIndex;
    onChange(next);
    setPicked(null);
  }
  function clear(slotIndex: number) {
    const next = [...slots];
    next[slotIndex] = -1;
    onChange(next);
  }

  return (
    <div className="grid gap-5">
      <p className="text-xs text-muted">Glisse chaque élément dans sa case, ou touche un élément puis la case.</p>
      <div className="grid gap-3">
        {question.slots.map((slot, slotIndex) => {
          const value = slots[slotIndex];
          return (
            <div
              key={`${slotIndex}-${slot}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dragged = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isInteger(dragged)) place(slotIndex, dragged);
              }}
              onClick={() => (picked !== null ? place(slotIndex, picked) : value >= 0 ? clear(slotIndex) : undefined)}
              className={`grid gap-2 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center ${picked !== null ? "border-accent/60" : "border-line"} bg-panel`}
            >
              <span className="text-sm font-medium leading-snug">{slot}</span>
              <span className={`flex min-h-12 items-center justify-center rounded-xl border border-dashed px-3 text-center text-sm ${value >= 0 ? "border-accent bg-accent/[.10] font-medium text-fg" : "border-line text-muted"}`}>
                {value >= 0 ? question.bank[value] : "Dépose ici"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Éléments à placer">
        {question.bank.map((item, bankIndex) => (
          <button
            key={`${bankIndex}-${item}`}
            type="button"
            draggable={!used.has(bankIndex)}
            disabled={used.has(bankIndex)}
            onDragStart={(event) => event.dataTransfer.setData("text/plain", String(bankIndex))}
            onClick={() => setPicked(picked === bankIndex ? null : bankIndex)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${used.has(bankIndex) ? "border-line text-muted opacity-40" : picked === bankIndex ? "border-accent bg-accent text-accent-ink" : "border-line bg-panel-raised hover:border-accent/50"}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function SwipeDeck({ question, answer, onChange }: { question: Extract<PresentedQuestion, { type: "SWIPE" }>; answer: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) {
  const choices = Array.isArray(answer) && answer.length === question.cards.length ? answer : (Array(question.cards.length).fill(-1) as number[]);
  const firstOpen = choices.findIndex((value) => value < 0);
  const [cursor, setCursor] = useState(firstOpen === -1 ? question.cards.length - 1 : firstOpen);
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  function choose(right: boolean) {
    const next = [...choices];
    next[cursor] = right ? 1 : 0;
    onChange(next);
    setDx(0);
    if (cursor < question.cards.length - 1) setCursor(cursor + 1);
  }

  const done = choices.every((value) => value >= 0);
  const tilt = Math.max(-1, Math.min(1, dx / 120));

  return (
    <div className="grid gap-5">
      <p className="text-xs text-muted">Carte {cursor + 1} sur {question.cards.length} · fais glisser à droite pour « {question.rightLabel} », à gauche pour « {question.leftLabel} ».</p>
      <div
        className="grid min-h-48 touch-pan-y select-none place-items-center rounded-3xl border border-line bg-panel-raised p-6 text-center text-lg font-medium leading-snug"
        style={{ transform: `translateX(${dx}px) rotate(${tilt * 6}deg)`, borderColor: tilt > 0.3 ? "var(--ok)" : tilt < -0.3 ? "var(--bad)" : undefined, transition: startX.current === null ? "transform .2s" : "none" }}
        onPointerDown={(event) => { startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (startX.current !== null) setDx(event.clientX - startX.current); }}
        onPointerUp={() => {
          const moved = dx;
          startX.current = null;
          if (Math.abs(moved) > 90) choose(moved > 0);
          else setDx(0);
        }}
      >
        {question.cards[cursor]}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => choose(false)} className={`min-h-12 rounded-full border px-4 text-sm font-semibold transition ${choices[cursor] === 0 ? "border-bad bg-bad/10" : "border-line bg-panel hover:border-bad/50"}`}>← {question.leftLabel}</button>
        <button type="button" onClick={() => choose(true)} className={`min-h-12 rounded-full border px-4 text-sm font-semibold transition ${choices[cursor] === 1 ? "border-ok bg-ok/10" : "border-line bg-panel hover:border-ok/50"}`}>{question.rightLabel} →</button>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <button type="button" disabled={cursor === 0} onClick={() => setCursor(cursor - 1)} className="underline underline-offset-4 disabled:opacity-40">Carte précédente</button>
        <span>{done ? "Toutes les cartes sont jugées" : `${choices.filter((v) => v >= 0).length} / ${question.cards.length} jugées`}</span>
      </div>
    </div>
  );
}
