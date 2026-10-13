"use client";

import { useEffect, useRef } from "react";

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
    let scrollY = window.scrollY;

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
      if (w === 0 || h === 0) return;
      ctx.globalCompositeOperation = "lighter";

      const drift = Math.sin(t * 0.00016 + scrollY * 0.0012);
      const haze = ctx.createRadialGradient(
        w * (0.52 + drift * 0.12),
        h * (base + Math.sin(t * 0.00012) * 0.06),
        0,
        w * 0.52,
        h * base,
        Math.max(w, h) * 0.66,
      );
      haze.addColorStop(0, "rgba(150,164,255,0.13)");
      haze.addColorStop(0.38, "rgba(138,119,220,0.07)");
      haze.addColorStop(1, "rgba(255,210,122,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);

      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, "rgba(170,181,255,0.9)");
      gradient.addColorStop(0.48, "rgba(184,176,240,0.82)");
      gradient.addColorStop(1, "rgba(255,210,122,0.88)");
      const N = 56;
      const scrollPhase = scrollY * 0.0012;
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1);
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 14) {
          const u = x / w;
          const y =
            h * base +
            Math.sin(u * f1 + t * 0.00034 + k * 1.6 + scrollPhase) * h * a1 * (0.4 + u) +
            Math.sin(u * f2 - t * 0.00025 + k * 3.2 - scrollPhase * 0.65) * h * a2 +
            (k - 0.5) * h * spread * (0.3 + u * 1.1);
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const center = Math.pow(1 - Math.abs(k - 0.5) * 2, 2);
        const alpha = 0.1 + 0.3 * center;
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.8 + center * 1.1;
        ctx.shadowColor = "rgba(170,181,255,0.22)";
        ctx.shadowBlur = center > 0.45 ? 10 : 0;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      size();
      draw(2500);
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };

    size();
    draw(2500);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

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
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [base, a1, a2, f1, f2, spread]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}