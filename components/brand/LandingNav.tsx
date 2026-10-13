"use client";

import { useEffect, useState } from "react";

const items = [
  { id: "avantages", label: "La méthode" },
  { id: "parcours", label: "Parcours" },
  { id: "offres", label: "Formules" },
];

export default function LandingNav({ mobile = false }: { mobile?: boolean }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.15, 0.4, 0.7] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={`items-center gap-1 rounded-full border border-line/80 bg-panel/65 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-xl ${
        mobile ? "flex justify-center border-0 bg-transparent shadow-none md:hidden" : "hidden md:flex"
      }`}
      aria-label={mobile ? "Navigation mobile" : "Navigation principale"}
    >
      {items.map((item) => (
        <a
          key={item.id}
          className={`rounded-full px-3 py-1.5 text-[11px] font-medium no-underline transition duration-300 sm:px-4 sm:py-2 sm:text-[13px] ${
            activeId === item.id
              ? "bg-white/[.09] text-fg shadow-[0_0_20px_-10px_var(--glow)]"
              : "text-muted hover:bg-white/[.05] hover:text-fg"
          }`}
          href={`#${item.id}`}
          aria-current={activeId === item.id ? "location" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
