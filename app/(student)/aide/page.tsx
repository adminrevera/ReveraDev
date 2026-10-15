import type { Metadata } from "next";
import Link from "next/link";
import { NewTicketForm } from "@/components/student/SupportForms";
import { Eyebrow, PageHeader } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Aide et support · Revera" };

const faq = [
  { q: "Comment un chapitre est-il validé ?", a: "Lis le cours partie par partie, puis réussis le quiz du chapitre. Le chapitre suivant s’ouvre quand le seuil de validation est atteint." },
  { q: "Quand la ligue s’ouvre-t-elle ?", a: "Dès que tu as validé deux chapitres, tous cours confondus. Tu rejoins alors un groupe d’étudiants et tu es classé chaque semaine à l’XP." },
  { q: "À quoi sert la révision espacée ?", a: "Elle te repose les questions au bon moment pour mieux retenir. Elle est incluse dans les offres Plus et Réussite." },
  { q: "J’ai payé mais mon abonnement n’est pas actif.", a: "Après le paiement, un code de confirmation t’est envoyé par e-mail. Saisis-le sur l’écran de confirmation : l’abonnement s’active aussitôt. Sinon, écris-nous ci-dessous." },
];

export default async function SupportPage() {
  const { profile } = await requireStudentProfile();
  const tickets = await prisma.supportTicket.findMany({ where: { userId: profile.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, subject: true, status: true } });
  return (
    <>
      <PageHeader eyebrow="Besoin d’un coup de main ?" title="Aide et support">Consulte les réponses rapides, ou écris-nous : l’équipe te répond ici.</PageHeader>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="grid gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Questions fréquentes</h2>
          {faq.map((entry) => (
            <details key={entry.q} className="rounded-2xl border border-line bg-panel p-4">
              <summary className="cursor-pointer list-none text-[15px] font-semibold">{entry.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{entry.a}</p>
            </details>
          ))}
          {tickets.length > 0 && (
            <>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">Mes demandes</h2>
              {tickets.map((ticket) => (
                <Link key={ticket.id} href={`/aide/${ticket.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4 text-fg no-underline transition hover:border-accent/40">
                  <span className="min-w-0 truncate text-sm font-medium">{ticket.subject}</span>
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{ticket.status === "open" ? "Ouverte" : "Résolue"}</span>
                </Link>
              ))}
            </>
          )}
        </section>
        <section className="rounded-2xl border border-line bg-panel/60 p-5">
          <Eyebrow>Nouvelle demande</Eyebrow>
          <h2 className="mb-4 mt-1 text-xl font-semibold tracking-tight">Écrire au support</h2>
          <NewTicketForm />
        </section>
      </div>
    </>
  );
}
