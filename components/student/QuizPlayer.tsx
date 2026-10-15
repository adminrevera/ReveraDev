"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import FocusTopBar from "@/components/student/FocusTopBar";
import QuestionView, { formatLabels, isAnswered } from "@/components/student/QuestionView";
import type { AnswerValue, PresentedQuestion } from "@/lib/questions";

type QuizAnswer = AnswerValue;
type QuizResult = {
  correct: number;
  total: number;
  percent: number;
  passed: boolean | null;
  validationPercent: number;
  newBadges: { slug: string; name: string }[];
  leagueOpened: boolean;
  results: {
    questionId: string;
    text: string;
    isCorrect: boolean;
    selectedText: string;
    correctText: string;
    explanation: string | null;
  }[];
};
type StartResponse = { error: string } | { error: null; attemptId: string; questions: PresentedQuestion[] };
type SubmitResponse = { error: string } | ({ error: null } & QuizResult);

const primary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink no-underline transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-panel px-6 text-[15px] font-semibold text-fg no-underline transition hover:border-accent/40 disabled:opacity-50";

export default function QuizPlayer({
  start,
  submitAnswers,
  exitHref,
  doneHref,
  doneLabel = "Retour au parcours",
  title,
  validationPercent,
  retryLabel = "Recommencer",
}: {
  start: () => Promise<StartResponse>;
  submitAnswers: (attemptId: string, answers: Record<string, AnswerValue>) => Promise<SubmitResponse>;
  exitHref: string;
  doneHref: string;
  doneLabel?: string;
  title: string;
  validationPercent?: number;
  retryLabel?: string;
}) {
  const subjectName = title;
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<PresentedQuestion[]>([]);
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
      const response = await start();
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
      setIndex(0);
      setResult(null);
    } catch (cause) {
      console.error("Unable to start chapter quiz:", cause);
      setError("Le quiz n’a pas pu être préparé. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, [start]);

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
      const response = await submitAnswers(attemptId, answers);
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

  if (loading && !questions.length) {
    return (
      <>
        <FocusTopBar exitHref={exitHref} exitLabel="Quitter" percent={0} />
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
        <FocusTopBar exitHref={exitHref} exitLabel="Quitter" percent={0} />
        <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="text-2xl font-semibold">Le quiz n’a pas pu démarrer</h1>
          {error && <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={restart} className={primary}>Réessayer</button>
            <Link href={exitHref} className={secondary}>Retour</Link>
          </div>
        </main>
      </>
    );
  }

  if (result) {
    return (
      <>
        <FocusTopBar exitHref={doneHref} exitLabel="Quitter" percent={100} />
        <main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-10 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">{subjectName} · Résultat</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{result.passed === null ? "Séance terminée" : result.passed ? "Chapitre validé" : "Séance terminée"}</h1>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="text-7xl font-semibold tabular-nums tracking-[-.05em] text-accent">{result.correct}</span>
            <span className="text-3xl text-muted">/{result.total}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">{result.percent} %</span>
            {result.passed !== null && <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">Seuil : {result.validationPercent} %</span>}
          </div>
          {result.passed !== null && (
            <p className={`mt-5 max-w-xl text-sm leading-relaxed ${result.passed ? "text-accent" : "text-muted"}`}>
              {result.passed
                ? "Bravo ! Le chapitre suivant est débloqué."
                : "Le chapitre suivant reste verrouillé. Relis les corrections puis réessaie : les questions seront tirées à nouveau."}
            </p>
          )}
          {result.leagueOpened && result.passed && <p className="mt-3 rounded-xl border border-accent/30 bg-accent/[.08] px-4 py-3 text-sm">Tu fais maintenant partie de la ligue de la semaine.</p>}
          {result.newBadges.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber/30 bg-amber/[.06] px-4 py-3 text-sm">
              <p className="font-semibold text-amber">{result.newBadges.length > 1 ? "Nouveaux badges" : "Nouveau badge"}</p>
              <p className="mt-1 text-muted">{result.newBadges.map((badge) => badge.name).join(" · ")}</p>
            </div>
          )}
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
            <Link href={doneHref} className={primary}>{doneLabel}</Link>
            <button type="button" onClick={restart} disabled={loading} className={secondary}>{loading ? "Préparation…" : retryLabel}</button>
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
        exitLabel="Quitter"
        percent={(answeredCount / questions.length) * 100}
        counter={`${index + 1} / ${questions.length}`}
      />
      <main className="mx-auto w-full max-w-3xl px-4 pb-44 pt-8 sm:px-6 sm:pt-10">
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-amber">
          {subjectName} · Question {index + 1} sur {questions.length} · {formatLabels[question.type]}
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-[-.03em] sm:text-3xl">{question.text}</h1>

        <div className="mt-7">
          <QuestionView question={question} answer={answer} onChange={setAnswer} />
        </div>

        {error && <p className="mt-5 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-[#FFD2CB]" role="alert">{error}</p>}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <p className="text-center text-xs text-muted">{last ? "Tes réponses sont corrigées à la fin de la séance." : validationPercent ? `Seuil de validation : ${validationPercent} %` : " "}</p>
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
