import type { ReactNode } from "react";

// Écrans « parcours guidé » (lecture, quiz) : pas de menu latéral, on reste concentré sur une seule tâche.
export default function FocusLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-svh bg-bg">{children}</div>;
}
