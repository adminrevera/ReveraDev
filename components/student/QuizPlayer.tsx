"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { startChapterQuiz, submitChapterQuiz } from "@/app/actions/quiz";

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

function isAnswered(question: QuizQuestion, answer: QuizAnswer | undefined) {
  if (question.type === "MCQ" || question.type === "TRUE_FALSE") return typeof answer === "number";
  if (question.type === "GAP") return typeof answer === "string" && answer.trim().length > 0;
  if (question.type === "MATCHING") return Array.isArray(answer) &&
    answer.length === question.terms.length &&
    new Set(answer).size === answer.length &&
    answer.every((index) => Number.isInteger(index) && index >= 0 && index < question.examples.length);
  return false;
}

export default function QuizPlayer({ itemId, validationPercent }: { itemId: string; validationPercent: number }) {
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [missingTypes, setMissingTypes] = useState<QuizType[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function textAnswer(questionId: string) {
    const answer = answers[questionId];
    return typeof answer === "string" ? answer : "";
  }

  function begin() {
    setError("");
    startTransition(async () => {
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
        setResult(null);
      } catch (cause) {
        console.error("Unable to start chapter quiz:", cause);
        setError("Le quiz n’a pas pu être préparé. Réessaie.");
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attemptId || !questions.every((question) => isAnswered(question, answers[question.id]))) {
      setError("Réponds à toutes les questions avant de valider.");
      return;
    }
    setError("");
    startTransition(async () => {
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
      }
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-7">
      {!questions.length ? (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Quiz de chapitre</p>
          <h2 className="mt-3 text-2xl font-semibold">Vérifie ce que tu as retenu</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Le quiz utilise les formats disponibles dans ce chapitre. Les réponses sont corrigées côté serveur ; il faut obtenir au moins {validationPercent} % pour valider le chapitre.</p>
          <button type="button" onClick={begin} disabled={pending} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60">
            {pending ? "Préparation…" : "Commencer le quiz"}
          </button>
        </div>
      ) : result ? (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Résultat</p>
          <h2 className="mt-3 text-3xl font-semibold">{result.correct} / {result.total}</h2>
          <p className={`mt-2 text-sm ${result.passed ? "text-accent" : "text-muted"}`}>
            {result.passed ? "Bravo, chapitre validé ! Tu peux continuer ton parcours." : `Tu as obtenu ${result.percent} %. Le seuil est de ${result.validationPercent} % ; relis les corrections puis réessaie.`}
          </p>
          <ol className="mt-5 grid gap-3">
            {result.results.map((answer) => <li key={answer.questionId} className="rounded-xl border border-line bg-bg2 p-4">
              <p className="font-medium">{answer.text}</p>
              <p className={`mt-2 text-sm ${answer.isCorrect ? "text-accent" : "text-bad"}`}>{answer.isCorrect ? "Bonne réponse" : `Bonne réponse : ${answer.correctText}`}</p>
              {!answer.isCorrect && <p className="mt-1 text-sm text-muted">Ta réponse : {answer.selectedText}</p>}
              {answer.explanation && <p className="mt-1 text-sm leading-relaxed text-muted">{answer.explanation}</p>}
            </li>)}
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={begin} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-full border border-accent/40 px-5 text-sm font-semibold disabled:opacity-60">{pending ? "Préparation…" : "Recommencer"}</button>
            <Link href="/parcours" className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm text-fg no-underline">Retour au parcours</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
            <div><p className="font-mono text-[11px] uppercase tracking-widest text-amber">Quiz de chapitre · formats variés</p><h2 className="mt-2 text-2xl font-semibold">À toi de jouer</h2></div>
            <p className="text-sm text-muted">{questions.filter((question) => isAnswered(question, answers[question.id])).length} / {questions.length} réponses</p>
          </div>
          {missingTypes.length > 0 && <p className="mb-4 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted">
            Formats absents de ce chapitre : {missingTypes.map((type) => ({
              MCQ: "QCM",
              TRUE_FALSE: "vrai/faux",
              GAP: "texte à trous",
              MATCHING: "association",
            })[type]).join(", ")}. Le quiz utilise les autres formats disponibles.
          </p>}
          <ol className="grid gap-5">
            {questions.map((question, index) => (
              <li key={question.id} className="rounded-xl border border-line bg-bg2 p-4 sm:p-5">
                <fieldset>
                  <legend className="font-semibold leading-relaxed"><span className="mr-2 text-amber">{index + 1}.</span>{question.text}</legend>
                  {(question.type === "MCQ" || question.type === "TRUE_FALSE") && <div className="mt-3 grid gap-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <label key={`${choiceIndex}-${choice}`} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${answers[question.id] === choiceIndex ? "border-accent/60 bg-accent/[.07]" : "border-line hover:border-accent/30"}`}>
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={choiceIndex}
                          checked={answers[question.id] === choiceIndex}
                          onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: choiceIndex }))}
                          className="mt-1 accent-accent"
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </div>}
                  {question.type === "GAP" && <div className="mt-3">
                    <label htmlFor={`question-${question.id}`} className="sr-only">Ta réponse</label>
                    <input
                      id={`question-${question.id}`}
                      type="text"
                      autoComplete="off"
                      maxLength={500}
                      value={textAnswer(question.id)}
                      onChange={(event) => setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))}
                      className="min-h-11 w-full rounded-lg border border-line bg-panel px-3 text-sm text-fg"
                      placeholder={question.hint ? `Indice : ${question.hint}` : "Saisis ta réponse"}
                    />
                  </div>}
                  {question.type === "MATCHING" && <div className="mt-3 grid gap-3">
                    {question.terms.map((term, termIndex) => {
                      const selected = answers[question.id];
                      const value = Array.isArray(selected) ? selected[termIndex] : undefined;
                      return <label key={`${termIndex}-${term}`} className="grid gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
                        <span>{term}</span>
                        <select
                          value={value === undefined ? "" : String(value)}
                          onChange={(event) => {
                            const next = Array.isArray(selected) ? [...selected] : Array(question.terms.length).fill(-1) as number[];
                            next[termIndex] = event.target.value === "" ? -1 : Number(event.target.value);
                            setAnswers((previous) => ({ ...previous, [question.id]: next }));
                          }}
                          className="min-h-11 min-w-0 rounded-lg border border-line bg-panel px-3 text-fg"
                        >
                          <option value="">Choisir un exemple</option>
                          {question.examples.map((example, exampleIndex) => <option key={`${exampleIndex}-${example}`} value={exampleIndex}>{example}</option>)}
                        </select>
                      </label>;
                    })}
                  </div>}
                </fieldset>
              </li>
            ))}
          </ol>
          {error && <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
          <button type="submit" disabled={pending || !questions.every((question) => isAnswered(question, answers[question.id]))} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Correction en cours…" : "Valider mes réponses"}
          </button>
        </form>
      )}
      {error && !questions.length && <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
    </section>
  );
}
