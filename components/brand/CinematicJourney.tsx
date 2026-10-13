"use client";

import { useEffect, useRef, useState } from "react";

const scenes = [
  {
    label: "01 · APPRENDRE",
    title: "Entre dans le cours.",
    description: "Des notions claires, organisées pour t’aider à comprendre avant de mémoriser.",
    metric: "12 min",
    metricLabel: "pour avancer à ton rythme",
  },
  {
    label: "02 · S’ENTRAÎNER",
    title: "Mets tes acquis à l’épreuve.",
    description: "Réponds, comprends tes erreurs et transforme chaque question en progrès.",
    metric: "8 / 10",
    metricLabel: "réponses correctes",
  },
  {
    label: "03 · PROGRESSER",
    title: "Vois le chemin parcouru.",
    description: "Une vision nette de tes acquis t’indique quoi réviser ensuite.",
    metric: "+18 %",
    metricLabel: "sur les dernières séances",
  },
  {
    label: "04 · SE PRÉPARER",
    title: "Avance vers le jour J.",
    description: "Entraîne-toi en conditions réelles et aborde l’examen avec confiance.",
    metric: "45 min",
    metricLabel: "pour une simulation",
  },
];

function LessonPreview() {
  return (
    <div className="preview-lesson">
      <span className="preview-kicker">CHAPITRE 03 · COMPTABILITÉ</span>
      <div className="preview-line preview-line-long" />
      <div className="preview-line preview-line-short" />
      <div className="preview-note">
        <span className="preview-note-mark">✦</span>
        <div><b>À retenir</b><span>Le bilan présente le patrimoine de l’entreprise.</span></div>
      </div>
      <div className="preview-line preview-line-mid" />
      <div className="preview-line preview-line-long" />
    </div>
  );
}

function QuizPreview() {
  return (
    <div className="preview-quiz">
      <span className="preview-kicker">QUESTION 04 / 10</span>
      <b className="preview-question">À quoi sert le bilan comptable ?</b>
      {["Mesurer la trésorerie uniquement", "Présenter le patrimoine à une date donnée", "Calculer le chiffre d’affaires"].map((answer, index) => (
        <div className={`preview-answer${index === 1 ? " preview-answer-correct" : ""}`} key={answer}>
          <span>{String.fromCharCode(65 + index)}</span>{answer}
        </div>
      ))}
    </div>
  );
}

function ProgressPreview() {
  return (
    <div className="preview-progress">
      <div className="preview-progress-head">
        <div><span className="preview-kicker">TA PROGRESSION</span><b>Cette semaine</b></div>
        <span className="preview-streak">✦ 5 jours</span>
      </div>
      <div className="preview-bars" aria-hidden="true">
        {[36, 51, 43, 68, 59, 83, 74, 100, 88, 112, 103, 130, 118, 148, 138, 166].map((height, index) => (
          <span key={index} style={{ height }} />
        ))}
      </div>
      <div className="preview-chart-labels"><span>LUN</span><span>MER</span><span>VEN</span><span>AUJ.</span></div>
    </div>
  );
}

function ExamPreview() {
  return (
    <div className="preview-exam">
      <span className="preview-kicker">SUJET BLANC · ÉPREUVE DE SYNTHÈSE</span>
      <b className="preview-timer">34:52</b>
      <div className="preview-timer-track"><span /></div>
      <div className="preview-exam-footer"><span>Question 12 sur 20</span><span>Temps restant</span></div>
      <div className="preview-exam-question">Analyse de situation<br />et recommandations</div>
    </div>
  );
}

const previews = [LessonPreview, QuizPreview, ProgressPreview, ExamPreview];

export default function CinematicJourney() {
  const trackRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const phase = progress * (scenes.length - 1);
  const activeIndex = Math.min(scenes.length - 1, Math.round(phase));
  const scene = scenes[activeIndex];
  const Preview = previews[activeIndex];
  const focus = 1 - Math.abs(phase - activeIndex);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = track.getBoundingClientRect();
        const distance = track.offsetHeight - window.innerHeight;
        setProgress(distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 0);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section
      id="parcours"
      ref={trackRef}
      className="cinematic-track scroll-mt-24"
      aria-label="Découvrir le parcours de révision Revera"
    >
      <div className="cinematic-stage">
        <div className="cinematic-world" aria-hidden="true">
          <div
            className="cinematic-grid"
            style={{
              transform: `perspective(900px) rotateX(${68 - progress * 8}deg) scale(${1 + progress * 0.2}) translateY(${progress * 24}px)`,
            }}
          />
          <div
            className="cinematic-portal cinematic-portal-back"
            style={{
              transform: `translate(-50%, -50%) rotateX(${67 - progress * 13}deg) scale(${0.78 + progress * 0.55})`,
            }}
          />
          <div
            className="cinematic-portal cinematic-portal-front"
            style={{
              transform: `translate(-50%, -50%) rotateX(${67 - progress * 13}deg) scale(${0.9 + progress * 0.48})`,
            }}
          />
          <div className="cinematic-light cinematic-light-left" style={{ opacity: 0.13 + progress * 0.12 }} />
          <div className="cinematic-light cinematic-light-right" style={{ opacity: 0.13 + progress * 0.12 }} />
        </div>

        <div className="cinematic-heading">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-amber sm:text-xs">
            TA PROGRESSION, EN MOUVEMENT
          </p>
          <h2 className="mt-3 max-w-[740px] text-[clamp(32px,5.2vw,62px)] leading-[1.02] font-semibold tracking-[-.045em] text-balance">
            Un pas après l’autre. <span className="text-accent">Jusqu’au déclic.</span>
          </h2>
          <p className="mt-3 max-w-[540px] text-sm leading-relaxed text-muted sm:text-base">
            Fais défiler pour entrer dans ton espace de révision.
          </p>
        </div>

        <div className="cinematic-card-stack">
          <article
            key={scene.label}
            className="cinematic-scene-card"
            aria-live="polite"
            style={{
              transform: `perspective(1200px) translate3d(0, ${Math.abs(phase - activeIndex) * 22}px, ${-80 + progress * 160 + focus * 12}px) rotateY(${(phase - activeIndex) * 7}deg)`,
            }}
          >
            <div className="cinematic-copy">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-amber sm:text-[11px]">{scene.label}</span>
              <h3>{scene.title}</h3>
              <p>{scene.description}</p>
              <div className="cinematic-metric">
                <b>{scene.metric}</b><span>{scene.metricLabel}</span>
              </div>
            </div>
            <div className="cinematic-screen">
              <div className="cinematic-window-bar">
                <span className="cinematic-window-dots"><i /><i /><i /></span>
                <span>revera.app</span>
                <span className="cinematic-window-avatar">R</span>
              </div>
              <Preview />
            </div>
          </article>
        </div>

        <ol className="cinematic-story-list" aria-label="Les étapes de ton parcours de révision">
          {scenes.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <b>{item.title}</b>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>

        <div className="cinematic-progress" aria-hidden="true">
          <span className="cinematic-progress-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="cinematic-scroll-label" aria-hidden="true">CONTINUE À DÉFILER <span>↓</span></p>
      </div>
    </section>
  );
}
