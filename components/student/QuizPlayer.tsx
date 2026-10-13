"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { startChapterQuiz, submitChapterQuiz } from "@/app/actions/quiz";

type QuizQuestion = { id: string; text: string; choices: string[] };
type QuizResult = {
  correct: number;
  total: number;
  passed: boolean;
  results: {
    questionId: string;
    text: string;
    selectedIndex: number;
    correctPresentedIndex: number;
    isCorrect: boolean;
    correctText: string;
    explanation: string | null;
  }[];
};

export default function QuizPlayer({ itemId }: { itemId: string }) {
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
    if (!attemptId || Object.keys(answers).length !== questions.length) {
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
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Quiz de chapitre · QCM</p>
          <h2 className="mt-3 text-2xl font-semibold">Vérifie ce que tu as retenu</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Les réponses sont corrigées côté serveur. Il faut obtenir 100 % pour valider le chapitre ; tu peux recommencer autant de fois que nécessaire.</p>
          <button type="button" onClick={begin} disabled={pending} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60">
            {pending ? "Préparation…" : "Commencer le quiz"}
          </button>
        </div>
      ) : result ? (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Résultat</p>
          <h2 className="mt-3 text-3xl font-semibold">{result.correct} / {result.total}</h2>
          <p className={`mt-2 text-sm ${result.passed ? "text-accent" : "text-muted"}`}>
            {result.passed ? "Bravo, chapitre validé ! Tu peux continuer ton parcours." : "Il faut répondre juste à toutes les questions. Relis les corrections puis réessaie."}
          </p>
          <ol className="mt-5 grid gap-3">
            {result.results.map((answer) => <li key={answer.questionId} className="rounded-xl border border-line bg-bg2 p-4">
              <p className="font-medium">{answer.text}</p>
              <p className={`mt-2 text-sm ${answer.isCorrect ? "text-accent" : "text-bad"}`}>{answer.isCorrect ? "Bonne réponse" : `Bonne réponse : ${answer.correctText}`}</p>
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
            <div><p className="font-mono text-[11px] uppercase tracking-widest text-amber">Quiz de chapitre · QCM</p><h2 className="mt-2 text-2xl font-semibold">À toi de jouer</h2></div>
            <p className="text-sm text-muted">{Object.keys(answers).length} / {questions.length} réponses</p>
          </div>
          <ol className="grid gap-5">
            {questions.map((question, index) => (
              <li key={question.id} className="rounded-xl border border-line bg-bg2 p-4 sm:p-5">
                <fieldset>
                  <legend className="font-semibold leading-relaxed"><span className="mr-2 text-amber">{index + 1}.</span>{question.text}</legend>
                  <div className="mt-3 grid gap-2">
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
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          {error && <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
          <button type="submit" disabled={pending || Object.keys(answers).length !== questions.length} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Correction en cours…" : "Valider mes réponses"}
          </button>
        </form>
      )}
      {error && !questions.length && <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
    </section>
  );
}
