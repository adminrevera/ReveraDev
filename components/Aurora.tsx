"use client";

import { createElement, useEffect, useRef } from "react";

type AuroraProps = {
  base: number;
  a1: number;
  a2: number;
  f1: number;
  f2: number;
  spread: number;
  className?: string;
};

// Ruban de lumière animé (décor). Respecte « réduire les animations ».
export default function Aurora({ base, a1, a2, f1, f2, spread, className }: AuroraProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const N = 46;
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1);
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 14) {
          const u = x / w;
          const y =
            h * base +
            Math.sin(u * f1 + t * 0.00028 + k * 1.6) * h * a1 * (0.4 + u) +
            Math.sin(u * f2 - t * 0.0002 + k * 3.2) * h * a2 +
            (k - 0.5) * h * spread * (0.3 + u * 1.1);
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const alpha = 0.05 + 0.18 * Math.pow(1 - Math.abs(k - 0.5) * 2, 2);
        ctx.strokeStyle = `rgba(${150 + Math.round(90 * k)},255,${30 + Math.round(40 * k)},${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      size();
      draw(2500);
    };

    size();
    draw(2500);
    window.addEventListener("resize", onResize);

    let observer: IntersectionObserver | undefined;
    if (!reduce) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(loop);
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      });
      observer.observe(canvas);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [base, a1, a2, f1, f2, spread]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}