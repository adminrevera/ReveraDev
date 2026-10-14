import type { ReactNode } from "react";
import StudentShell from "@/components/student/StudentShell";
import { requireStudentProfile } from "@/lib/auth/access";

// Le menu et l'en-tête vivent ici : ils ne sont pas rechargés quand on change d'écran.
// Seul le contenu de la page (et son squelette loading.tsx) change, donc la navigation est immédiate.
export default async function StudentLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireStudentProfile();
  return <StudentShell role={profile.role} xp={profile.xpTotal}>{children}</StudentShell>;
}
