"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { startChapterQuiz, submitChapterQuiz } from "@/app/actions/quiz";
import FocusTopBar from "@/components/student/FocusTopBar";

type QuizQuestion =
  | { id: string; text: string; type: "MCQ" | "TRUE_FALSE"; choices: string[] }
  | { id: string; text: string; type: "GAP"; hint: string | null }
  | { id: string; text: string; type: "MATCHING"; terms: string[]; examples: string[] };
type QuizAnswer = number | string | number[];
type QuizType = "MCQ" | "TRUE_FALSE" | "GAP" | "MATCHING";
type QuizResult = {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  validationPercent: number;
  results: {
    questionId: string;
    text: string;
    isCorrect: boolean;
    selectedText: string;
    correctText: string;
    explanation: string | null;
  }[];
};

const typeLabels: Record<QuizType, string> = {
  MCQ: "QCM",
  TRUE_FALSE: "Vrai ou faux",
  GAP: "Texte à trous",
  MATCHING: "Association",
};

function isAnswered(question: QuizQuestion, answer: QuizAnswer | undefined) {
  if (question.type === "MCQ" || question.type === "TRUE_FALSE") return typeof answer === "number";
  if (question.type === "GAP") return typeof answer === "string" && answer.trim().length > 0;
  if (question.type === "MATCHING") return Array.isArray(answer) &&
    answer.length === question.terms.length &&
    new Set(answer).size === answer.length &&
    answer.every((index) => Number.isInteger(index) && index >= 0 && index < question.examples.length);
  return false;
}

const primary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink no-underline transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-panel px-6 text-[15px] font-semibold text-fg no-underline transition hover:border-accent/40 disabled:opacity-50";

export default function QuizPlayer({
  itemId,
  subjectName,
  validationPercent,
}: {
  itemId: string;
  subjectName: string;
  validationPercent: number;
}) {
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [missingTypes, setMissingTypes] = useState<QuizType[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  const begin = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await startChapterQuiz(itemId);
      if (response.error !== null) {
        setError(response.error);
        return;
      }
      if (!response.questions.length) {
        setError("Le quiz n’a pas retourné de questions valides.");
        return;
      }
      setAttemptId(response.attemptId);
      setQuestions(response.questions);
      setMissingTypes(response.missingTypes);
      setAnswers({});
      setIndex(0);
      setResult(null);
    } catch (cause) {
      console.error("Unable to start chapter quiz:", cause);
      setError("Le quiz n’a pas pu être préparé. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  // Le quiz démarre dès l'ouverture de l'écran : pas de page d'introduction supplémentaire.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void begin();
  }, [begin]);

  function restart() {
    void begin();
  }

  async function submit() {
    if (!attemptId || !questions.every((question) => isAnswered(question, answers[question.id]))) {
      setError("Réponds à toutes les questions avant de terminer.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const response = await submitChapterQuiz(attemptId, answers);
      if (response.error !== null) {
        setError(response.error);
        return;
      }
      setResult(response);
    } catch (cause) {
      console.error("Unable to submit chapter quiz:", cause);
      setError("Les réponses n’ont pas pu être corrigées. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  const exitHref = `/parcours/${itemId}`;

  if (loading && !questions.length) {
    return (
      <>
        <FocusTopBar exitHref={exitHref} exitLabel="Quitter le quiz" percent={0} />
        <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-10 sm:px-6" aria-busy="true">
          <p className="sr-only">Préparation du quiz…</p>
          <div aria-hidden="true" className="grid animate-pulse gap-4">
            <div className="h-3 w-48 rounded bg-panel" />
            <div className="h-10 w-3/4 rounded bg-panel" />
            <div className="h-14 rounded-2xl border border-line bg-panel" />
            <div className="h-14 rounded-2xl border border-line bg-panel" />
            <div className="h-14 rounded-2xl border border-line bg-panel" />
          </div>
        </main>
      </>
    );
  }

  if (!questions.length) {
    return (
      <>
        <FocusTopBar exitHref={exitHref} exitLabel="Quitter le quiz" percent={0} />
        <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="text-2xl font-semibold">Le quiz n’a pas pu démarrer</h1>
          {error && <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={restart} className={primary}>Réessayer</button>
            <Link href={exitHref} className={secondary}>Retour au chapitre</Link>
          </div>
        </main>
      </>
    );
  }

  if (result) {
    return (
      <>
        <FocusTopBar exitHref="/parcours" exitLabel="Retourner au parcours" percent={100} />
        <main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-10 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">{subjectName} · Résultat</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{result.passed ? "Chapitre validé" : "Séance terminée"}</h1>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="text-7xl font-semibold tabular-nums tracking-[-.05em] text-accent">{result.correct}</span>
            <span className="text-3xl text-muted">/{result.total}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">{result.percent} %</span>
            <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">Seuil : {result.validationPercent} %</span>
          </div>
          <p className={`mt-5 max-w-xl text-sm leading-relaxed ${result.passed ? "text-accent" : "text-muted"}`}>
            {result.passed
              ? "Bravo ! Le chapitre suivant est débloqué."
              : "Le chapitre suivant reste verrouillé. Relis les corrections puis réessaie : les questions seront tirées à nouveau."}
          </p>
          <h2 className="mb-3 mt-9 text-lg font-semibold">Corrections</h2>
          <ol className="grid gap-3">
            {result.results.map((answer, i) => (
              <li key={answer.questionId} className={`rounded-2xl border p-4 ${answer.isCorrect ? "border-ok/25 bg-ok/[.05]" : "border-bad/25 bg-bad/[.05]"}`}>
                <p className="text-xs text-muted">Question {i + 1}</p>
                <p className="mt-1 font-medium leading-relaxed">{answer.text}</p>
                <p className={`mt-2 text-sm ${answer.isCorrect ? "text-ok" : "text-bad"}`}>{answer.isCorrect ? "Bonne réponse" : `Bonne réponse : ${answer.correctText}`}</p>
                {!answer.isCorrect && <p className="mt-1 text-sm text-muted">Ta réponse : {answer.selectedText}</p>}
                {answer.explanation && <p className="mt-2 text-sm leading-relaxed text-muted">{answer.explanation}</p>}
              </li>
            ))}
          </ol>
        </main>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
            <Link href="/parcours" className={primary}>Retour au parcours</Link>
            <button type="button" onClick={restart} disabled={loading} className={secondary}>{loading ? "Préparation…" : "Recommencer"}</button>
          </div>
        </div>
      </>
    );
  }

  const question = questions[index];
  const answer = answers[question.id];
  const answered = isAnswered(question, answer);
  const last = index === questions.length - 1;
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;

  function setAnswer(value: QuizAnswer) {
    setAnswers((previous) => ({ ...previous, [question.id]: value }));
  }

  return (
    <>
      <FocusTopBar
        exitHref={exitHref}
        exitLabel="Quitter le quiz et revenir au chapitre"
        percent={(answeredCount / questions.length) * 100}
        counter={`${index + 1} / ${questions.length}`}
      />
      <main className="mx-auto w-full max-w-3xl px-4 pb-44 pt-8 sm:px-6 sm:pt-10">
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">
          {subjectName} · Question {index + 1} sur {questions.length} · {typeLabels[question.type]}
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-[-.03em] sm:text-3xl">{question.text}</h1>

        <fieldset className="mt-7">
          <legend className="sr-only">Ta réponse</legend>
          {question.type === "MCQ" && (
            <div className="grid gap-3">
              {question.choices.map((choice, choiceIndex) => {
                const selected = answer === choiceIndex;
                return (
                  <label key={`${choiceIndex}-${choice}`} className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-[15px] transition ${selected ? "border-accent bg-accent/[.10] shadow-[inset_0_0_0_1px_var(--accent)]" : "border-line bg-panel hover:border-accent/40"}`}>
                    <input type="radio" name={`question-${question.id}`} value={choiceIndex} checked={selected} onChange={() => setAnswer(choiceIndex)} className="sr-only" />
                    <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg border text-sm font-semibold ${selected ? "border-accent bg-accent text-accent-ink" : "border-line text-muted"}`}>{String.fromCharCode(65 + choiceIndex)}</span>
                    <span className="leading-snug">{choice}</span>
                  </label>
                );
              })}
            </div>
          )}
          {question.type === "TRUE_FALSE" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {question.choices.map((choice, choiceIndex) => {
                const selected = answer === choiceIndex;
                return (
                  <label key={`${choiceIndex}-${choice}`} className={`flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border p-4 text-lg font-semibold transition ${selected ? "border-accent bg-accent/[.10] shadow-[inset_0_0_0_1px_var(--accent)]" : "border-line bg-panel hover:border-accent/40"}`}>
                    <input type="radio" name={`question-${question.id}`} value={choiceIndex} checked={selected} onChange={() => setAnswer(choiceIndex)} className="sr-only" />
                    {choice}
                  </label>
                );
              })}
            </div>
          )}
          {question.type === "GAP" && (
            <div>
              <label htmlFor={`question-${question.id}`} className="sr-only">Ta réponse</label>
              <input
                id={`question-${question.id}`}
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                maxLength={500}
                value={typeof answer === "string" ? answer : ""}
                onChange={(event) => setAnswer(event.target.value)}
                className="min-h-14 w-full rounded-2xl border border-line bg-panel px-4 text-[16px] text-fg outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/15"
                placeholder={question.hint ? `Indice : ${question.hint}` : "Saisis ta réponse"}
              />
            </div>
          )}
          {question.type === "MATCHING" && (
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
                        setAnswer(next);
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
          )}
        </fieldset>

        {index === 0 && missingTypes.length > 0 && (
          <p className="mt-6 rounded-xl border border-line bg-panel px-3 py-2 text-xs leading-relaxed text-muted">
            Formats absents de ce chapitre : {missingTypes.map((type) => typeLabels[type].toLowerCase()).join(", ")}. Le quiz utilise les autres formats disponibles.
          </p>
        )}
        {error && <p className="mt-5 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <p className="text-center text-xs text-muted">{last ? "Tes réponses sont corrigées à la fin du quiz." : `Seuil de validation : ${validationPercent} %`}</p>
          <div className="flex gap-3">
            {index > 0 && (
              <button type="button" onClick={() => setIndex(index - 1)} disabled={submitting} className={`${secondary} !w-auto shrink-0`} aria-label="Question précédente">←</button>
            )}
            {last ? (
              <button type="button" onClick={submit} disabled={!answered || submitting} className={primary}>{submitting ? "Correction en cours…" : "Terminer le quiz"}</button>
            ) : (
              <button type="button" onClick={() => setIndex(index + 1)} disabled={!answered} className={primary}>Continuer</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
