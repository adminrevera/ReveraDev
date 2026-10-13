import type { Metadata } from "next";
import { PlanTier, Role } from "@prisma/client";
import {
  createContentRevision,
  createEvent,
  createQuest,
  publishAnnouncement,
  replyToSupportTicket,
  reviewContent,
  setStudentSuspended,
  updateAiBudget,
  updatePlanPrice,
  updateTierLimits,
} from "@/app/admin/actions";
import AdminShell, { AdminHeading, AdminPanel, adminButton, adminInput } from "@/components/admin/AdminShell";
import AccessKeyGenerator from "@/components/admin/AccessKeyGenerator";
import { requireAdminPage } from "@/lib/auth/access";
import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: `Administration · ${APP_NAME}` };

const sections = new Set(["overview", "content", "students", "payments", "operations", "settings", "audit"]);
const money = (amount: number) => new Intl.NumberFormat("fr-FR").format(amount);
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
const tierNames: Record<PlanTier, string> = { FREE: "Gratuit", PLUS: "Plus", SUCCESS: "Réussite" };

function AdminTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[680px] text-left text-sm">{children}</table></div>;
}

function AdminTh({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-line bg-bg2 px-3 py-2.5 text-xs font-medium text-muted">{children}</th>;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ section?: string; q?: string }> }) {
  await requireAdminPage();
  const params = await searchParams;
  const section = params.section && sections.has(params.section) ? params.section : "overview";
  const query = (params.q ?? "").trim().slice(0, 100);

  return (
    <AdminShell section={section}>
      {section === "overview" && <Overview />}
      {section === "content" && <ContentStudio />}
      {section === "students" && <Students query={query} />}
      {section === "payments" && <Payments />}
      {section === "operations" && <Operations />}
      {section === "settings" && <Settings />}
      {section === "audit" && <Audit />}
    </AdminShell>
  );
}

async function Overview() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [students, pendingReview, pendingPayments, openTickets, generation, logs] = await Promise.all([
    prisma.profile.count({ where: { role: Role.STUDENT } }),
    prisma.contentVersion.count({ where: { status: { in: ["AI_DRAFT", "IN_REVIEW", "APPROVED"] } } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.generationJob.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { costUsd: true }, _count: true }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { displayName: true, email: true } } } }),
  ]);

  const cards = [
    ["Étudiants", students, "Comptes enregistrés"],
    ["Contenus à traiter", pendingReview, "Brouillons, relecture ou validation"],
    ["Paiements en attente", pendingPayments, "Suivi administratif"],
    ["Tickets ouverts", openTickets, "Demandes de support"],
  ];
  return (
    <>
      <AdminHeading eyebrow="Espace réservé" title="Vue d’ensemble" description="Un aperçu des comptes, de la production de contenu et des opérations à traiter." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, detail]) => (
          <article key={label} className="rounded-2xl border border-line bg-panel p-5">
            <p className="text-sm text-muted">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <AdminPanel title="Activité administrative récente">
          {logs.length === 0 ? <p className="text-sm text-muted">Les actions sensibles apparaîtront ici.</p> : (
            <ul className="divide-y divide-line">
              {logs.map((log) => <li key={log.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span><b className="font-medium">{log.action}</b><span className="ml-2 text-muted">{log.entity}</span><span className="ml-2 text-xs text-muted">{log.actor?.displayName ?? log.actor?.email ?? "Système"}</span></span>
                <time className="text-xs text-muted">{date(log.createdAt)}</time>
              </li>)}
            </ul>
          )}
        </AdminPanel>
        <AdminPanel title="Budget IA · mois en cours">
          <p className="text-3xl font-semibold">${generation._sum.costUsd?.toFixed(2) ?? "0.00"}</p>
          <p className="mt-1 text-sm text-muted">{generation._count} génération(s) enregistrée(s) depuis le début du mois.</p>
          <p className="mt-4 rounded-xl border border-amber/20 bg-amber/[.06] p-3 text-xs leading-relaxed text-muted">La génération Claude et l’envoi des sources ne sont pas encore connectés. Aucun brouillon n’est généré ni publié par cette console.</p>
        </AdminPanel>
      </div>
    </>
  );
}

async function ContentStudio() {
  const versions = await prisma.contentVersion.findMany({
    where: { status: { in: ["AI_DRAFT", "IN_REVIEW", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { item: { include: { subject: { include: { level: { include: { track: { include: { institution: true } } } } } } } } },
  });
  return (
    <>
      <AdminHeading eyebrow="Studio de contenu" title="Relire et publier" description="Toute modification crée une nouvelle version. Une version doit être approuvée explicitement avant de pouvoir être publiée." />
      <AdminPanel title={`Versions en attente · ${versions.length}`}>
        <div className="grid gap-4">
          {versions.length === 0 && <p className="text-sm text-muted">Aucune version en attente de validation.</p>}
          {versions.map((version) => (
            <article key={version.id} className="rounded-xl border border-line bg-bg2/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber">{version.status} · v{version.version}</p>
                  <h3 className="mt-1 font-semibold">{version.title}</h3>
                  <p className="mt-1 text-xs text-muted">{version.item.subject.name} · {version.item.subject.level.name} · créée {date(version.createdAt)}</p>
                  {version.note && <p className="mt-2 text-sm text-muted">{version.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={reviewContent}><input type="hidden" name="versionId" value={version.id} /><button className={adminButton} name="action" value="approve" disabled={version.status === "APPROVED"}>Approuver</button></form>
                  <form action={reviewContent}><input type="hidden" name="versionId" value={version.id} /><button className={adminButton} name="action" value="publish" disabled={version.status !== "APPROVED"}>Publier</button></form>
                </div>
              </div>
              {version.item.kind === "CHAPTER" && (
                <details className="mt-4 border-t border-line pt-3">
                  <summary className="cursor-pointer text-sm text-muted">Créer une nouvelle version corrigée</summary>
                  <form action={createContentRevision} className="mt-3 grid gap-3">
                    <input type="hidden" name="itemId" value={version.itemId} />
                    <label className="grid gap-1 text-xs text-muted">Titre<input className={adminInput} name="title" defaultValue={version.title} required maxLength={180} /></label>
                    <label className="grid gap-1 text-xs text-muted">Texte du cours<textarea className={`${adminInput} min-h-36 py-3`} name="body" defaultValue={version.bodyHtml ?? ""} maxLength={100000} /></label>
                    <label className="grid gap-1 text-xs text-muted">Résumé de la correction<input className={adminInput} name="note" required minLength={3} maxLength={500} placeholder="Ex. Clarification de la définition…" /></label>
                    <p className="text-xs leading-relaxed text-muted">Les questions et fiches de la version précédente sont reprises. Cette saisie est du texte ; l’import HTML ou PDF et la génération Claude sont à connecter.</p>
                    <button className={adminButton}>Enregistrer en « à relire »</button>
                  </form>
                </details>
              )}
            </article>
          ))}
        </div>
      </AdminPanel>
    </>
  );
}

async function Students({ query }: { query: string }) {
  const students = await prisma.profile.findMany({
    where: {
      role: Role.STUDENT,
      ...(query ? { OR: [{ email: { contains: query, mode: "insensitive" } }, { displayName: { contains: query, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { level: { select: { name: true } }, _count: { select: { attempts: true, payments: true, tickets: true } } },
  });
  return (
    <>
      <AdminHeading eyebrow="Comptes" title="Étudiants" description="Recherche et suivi des comptes, de l’activité et des demandes d’assistance. Les suspensions et réactivations sont journalisées." />
      <form className="mb-4 flex gap-2" action="/admin">
        <input type="hidden" name="section" value="students" />
        <input className={adminInput} name="q" defaultValue={query} placeholder="Nom ou adresse e-mail" aria-label="Rechercher un étudiant" />
        <button className={adminButton}>Rechercher</button>
      </form>
      <AdminPanel title={`Comptes récents · ${students.length}`}>
        <AdminTable><thead><tr><AdminTh>Étudiant</AdminTh><AdminTh>Parcours</AdminTh><AdminTh>Inscription</AdminTh><AdminTh>Activité</AdminTh><AdminTh>Accès</AdminTh></tr></thead>
          <tbody>{students.map((student) => <tr key={student.id} className="border-b border-line last:border-0">
            <td className="px-3 py-3"><p className="font-medium">{student.displayName ?? "Sans nom"}</p><p className="text-xs text-muted">{student.email}</p></td>
            <td className="px-3 py-3 text-muted">{student.level?.name ?? "Non renseigné"}</td>
            <td className="px-3 py-3 text-muted">{date(student.createdAt)}</td>
            <td className="px-3 py-3 text-xs text-muted">{student._count.attempts} réponses · {student._count.payments} paiements · {student._count.tickets} tickets</td>
            <td className="px-3 py-3">
              <form action={setStudentSuspended}><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="suspended" value={student.suspendedAt ? "false" : "true"} />
                <button className={adminButton}>{student.suspendedAt ? "Réactiver" : "Suspendre"}</button>
              </form>
            </td>
          </tr>)}</tbody>
        </AdminTable>
      </AdminPanel>
    </>
  );
}

async function Payments() {
  const [payments, counts] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { user: { select: { displayName: true, email: true } }, plan: { select: { name: true } } } }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountXof: true } }),
  ]);
  return (
    <>
      <AdminHeading eyebrow="Facturation" title="Paiements" description="Consultation des enregistrements existants. Aucun paiement PayDunya ne peut être confirmé ou déclenché depuis cette console tant que le flux signé de paiement n’est pas implémenté." />
      <div className="mb-5 flex flex-wrap gap-2">{counts.map((entry) => <p key={entry.status} className="rounded-xl border border-line bg-panel px-4 py-3 text-sm"><b>{entry.status}</b> · {entry._count._all} · {money(entry._sum.amountXof ?? 0)} FCFA</p>)}</div>
      <AdminPanel title="Transactions récentes">
        <AdminTable><thead><tr><AdminTh>Date</AdminTh><AdminTh>Étudiant</AdminTh><AdminTh>Offre</AdminTh><AdminTh>Montant</AdminTh><AdminTh>Statut</AdminTh><AdminTh>Canal</AdminTh></tr></thead>
          <tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-line last:border-0">
            <td className="px-3 py-3 text-muted">{date(payment.createdAt)}</td>
            <td className="px-3 py-3"><p>{payment.user.displayName ?? "Sans nom"}</p><p className="text-xs text-muted">{payment.user.email}</p></td>
            <td className="px-3 py-3">{payment.plan.name}</td><td className="px-3 py-3">{money(payment.amountXof)} FCFA</td>
            <td className="px-3 py-3">{payment.status}</td><td className="px-3 py-3 text-muted">{payment.method ?? payment.provider}</td>
          </tr>)}</tbody>
        </AdminTable>
      </AdminPanel>
    </>
  );
}

async function Operations() {
  const [levels, events, quests, tickets, announcements] = await Promise.all([
    prisma.level.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.questDefinition.findMany({ orderBy: { title: "asc" }, take: 20 }),
    prisma.supportTicket.findMany({ where: { status: "open" }, orderBy: { createdAt: "asc" }, take: 20, include: { user: { select: { displayName: true, email: true } } } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return (
    <>
      <AdminHeading eyebrow="Animation" title="Événements, quêtes & support" description="Crée des objectifs visibles par les étudiants, diffuse des annonces ciblées et réponds aux tickets. Les annonces sont adressées aux comptes éligibles au moment de l’envoi." />
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel title="Nouvel événement">
          <form action={createEvent} className="grid gap-3">
            <input className={adminInput} name="title" required minLength={3} maxLength={120} placeholder="Titre de l’événement" />
            <textarea className={`${adminInput} min-h-20 py-3`} name="description" maxLength={1000} placeholder="Description" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className={adminInput} name="kind" defaultValue="SOLO"><option value="SOLO">Solo</option><option value="TEAM">Équipe</option></select>
              <input className={adminInput} name="goal" type="number" required min={1} placeholder="Objectif" />
              <input className={adminInput} name="unit" required maxLength={40} placeholder="Unité (questions…)" />
              <input className={adminInput} name="rewardXp" type="number" required min={0} defaultValue={0} placeholder="XP à gagner" />
              <label className="grid gap-1 text-xs text-muted">Début (heure de Lomé)<input className={adminInput} name="startsAt" type="datetime-local" required /></label>
              <label className="grid gap-1 text-xs text-muted">Fin (heure de Lomé)<input className={adminInput} name="endsAt" type="datetime-local" required /></label>
            </div>
            <button className={adminButton}>Créer l’événement</button>
          </form>
          <ul className="mt-4 divide-y divide-line">{events.map((event) => <li key={event.id} className="py-2 text-sm"><b>{event.title}</b><span className="ml-2 text-xs text-muted">{event.status}</span></li>)}</ul>
        </AdminPanel>
        <AdminPanel title="Nouvelle quête">
          <form action={createQuest} className="grid gap-3">
            <input className={adminInput} name="title" required minLength={3} maxLength={120} placeholder="Ex. Répondre à 5 questions" />
            <select className={adminInput} name="metric" defaultValue="ANSWERS"><option value="ANSWERS">Réponses</option><option value="XP">XP gagné</option><option value="CHAPTERS">Chapitres validés</option></select>
            <div className="grid gap-3 sm:grid-cols-2"><input className={adminInput} name="target" type="number" required min={1} placeholder="Objectif" /><input className={adminInput} name="rewardXp" type="number" required min={0} placeholder="Récompense XP" /></div>
            <p className="text-xs text-muted">La quête est programmée pour aujourd’hui (heure de Lomé). La rotation quotidienne automatique reste à configurer.</p>
            <button className={adminButton}>Créer la quête</button>
          </form>
          <ul className="mt-4 divide-y divide-line">{quests.slice(0, 8).map((quest) => <li key={quest.id} className="py-2 text-sm">{quest.title}<span className="ml-2 text-xs text-muted">{quest.active ? "active" : "inactive"}</span></li>)}</ul>
        </AdminPanel>
        <AdminPanel title="Diffuser une annonce">
          <form action={publishAnnouncement} className="grid gap-3">
            <input className={adminInput} name="title" required minLength={3} maxLength={140} placeholder="Titre" />
            <textarea className={`${adminInput} min-h-24 py-3`} name="body" required minLength={3} maxLength={3000} placeholder="Message" />
            <select className={adminInput} name="audience" defaultValue="ALL"><option value="ALL">Tous les étudiants</option><option value="SUBSCRIBERS">Abonnés actifs</option><option value="FREE">Offre gratuite</option><option value="LEVEL">Niveau précis</option></select>
            <select className={adminInput} name="levelId" defaultValue=""><option value="">Choisir le niveau (si ciblé)</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select>
            <button className={adminButton}>Envoyer l’annonce</button>
          </form>
          <ul className="mt-4 divide-y divide-line">{announcements.map((announcement) => <li key={announcement.id} className="py-2 text-sm"><b>{announcement.title}</b><span className="ml-2 text-xs text-muted">{announcement.audience} · {date(announcement.createdAt)}</span></li>)}</ul>
        </AdminPanel>
        <AdminPanel title="Tickets de support ouverts">
          {tickets.length === 0 ? <p className="text-sm text-muted">Aucun ticket en attente.</p> : <div className="grid gap-3">{tickets.map((ticket) => <article key={ticket.id} className="rounded-xl border border-line p-3">
            <h3 className="font-medium">{ticket.subject}</h3><p className="mt-1 text-xs text-muted">{ticket.user.displayName ?? ticket.user.email} · {date(ticket.createdAt)}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{ticket.message}</p>
            <form action={replyToSupportTicket} className="mt-3 grid gap-2"><input type="hidden" name="ticketId" value={ticket.id} /><textarea className={`${adminInput} min-h-20 py-3`} name="body" required minLength={2} maxLength={4000} placeholder="Réponse au ticket" /><button className={adminButton}>Répondre et clôturer</button></form>
          </article>)}</div>}
        </AdminPanel>
      </div>
    </>
  );
}

async function Settings() {
  const [plans, limits, budgetSetting, keys] = await Promise.all([
    prisma.plan.findMany({ orderBy: { tier: "asc" } }),
    prisma.tierLimits.findMany({ orderBy: { tier: "asc" } }),
    prisma.appSetting.findUnique({ where: { key: "ai.monthlyBudgetUsd" } }),
    prisma.accessKey.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { plan: { select: { name: true } }, usedBy: { select: { email: true } } } }),
  ]);
  const budget = typeof budgetSetting?.value === "number" ? budgetSetting.value : 0;
  return (
    <>
      <AdminHeading eyebrow="Configuration" title="Offres & réglages" description="Les changements de prix et de limites sont appliqués côté données et inscrits au journal d’audit. Les paiements restent inactifs tant qu’une intégration sécurisée n’est pas configurée." />
      <div className="grid gap-5">
        <AdminPanel title="Prix des offres">
          <div className="grid gap-3 md:grid-cols-3">{plans.map((plan) => <form key={plan.id} action={updatePlanPrice} className="rounded-xl border border-line p-4">
            <input type="hidden" name="planId" value={plan.id} /><p className="font-semibold">{plan.name}</p><p className="mb-3 text-xs text-muted">{tierNames[plan.tier]} · {plan.durationDays} jours</p>
            <label className="grid gap-1 text-xs text-muted">Prix en FCFA<input className={adminInput} name="priceXof" type="number" min={0} max={100000000} defaultValue={plan.priceXof} required /></label><button className={`${adminButton} mt-3`}>Enregistrer le prix</button>
          </form>)}</div>
        </AdminPanel>
        <AdminPanel title="Limites et fonctions par offre">
          <div className="grid gap-3 lg:grid-cols-3">{[PlanTier.FREE, PlanTier.PLUS, PlanTier.SUCCESS].map((tier) => {
            const current = limits.find((item) => item.tier === tier);
            return <form key={tier} action={updateTierLimits} className="grid gap-3 rounded-xl border border-line p-4">
              <input type="hidden" name="tier" value={tier} /><h3 className="font-semibold">{tierNames[tier]}</h3>
              <LimitInput label="Séances d’entraînement / jour" name="dailyTrainingSessions" value={current?.dailyTrainingSessions} />
              <LimitInput label="Jeux / jour" name="dailyGames" value={current?.dailyGames} />
              <LimitInput label="Examens / matière" name="examsPerSubject" value={current?.examsPerSubject} />
              <label className="grid gap-1 text-xs text-muted">Gel de série / mois<input className={adminInput} name="streakFreezesPerMonth" type="number" min={0} max={365} defaultValue={current?.streakFreezesPerMonth ?? 0} /></label>
              <ToggleField label="Révision espacée" name="spacedReview" checked={current?.spacedReview ?? false} />
              <ToggleField label="Correction détaillée" name="detailedExamCorrection" checked={current?.detailedExamCorrection ?? false} />
              <ToggleField label="Groupe d’entraide" name="helpGroup" checked={current?.helpGroup ?? false} />
              <button className={adminButton}>Enregistrer les limites</button>
            </form>;
          })}</div>
        </AdminPanel>
        <div className="grid gap-5 xl:grid-cols-2">
          <AdminPanel title="Budget IA mensuel">
            <form action={updateAiBudget} className="flex flex-wrap items-end gap-3"><label className="grid min-w-48 flex-1 gap-1 text-xs text-muted">Plafond en USD<input className={adminInput} name="monthlyBudgetUsd" type="number" min={0} step="0.01" defaultValue={budget} required /></label><button className={adminButton}>Enregistrer le budget</button></form>
            <p className="mt-3 text-xs text-muted">Valeur enregistrée. Le service de génération ne lit pas encore ce réglage.</p>
          </AdminPanel>
          <AdminPanel title="Créer une clé d’activation">
            <AccessKeyGenerator plans={plans.map(({ id, name }) => ({ id, name }))} />
            <p className="mt-3 text-xs text-muted">Le code est affiché une seule fois après création ; l’activation côté étudiant n’est pas encore disponible.</p>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><AdminTh>Clé</AdminTh><AdminTh>Offre</AdminTh><AdminTh>État</AdminTh></tr></thead><tbody>{keys.map((key) => <tr key={key.id} className="border-b border-line"><td className="px-3 py-2 font-mono">••••{key.code.slice(-4)}</td><td className="px-3 py-2">{key.plan.name}</td><td className="px-3 py-2">{key.usedBy ? `Utilisée par ${key.usedBy.email}` : "Disponible"}</td></tr>)}</tbody></table></div>
          </AdminPanel>
        </div>
      </div>
    </>
  );
}

function LimitInput({ label, name, value }: { label: string; name: string; value: number | null | undefined }) {
  return <label className="grid gap-1 text-xs text-muted">{label}<input className={adminInput} name={name} type="number" min={0} max={1000000} placeholder="Vide = illimité" defaultValue={value ?? ""} /></label>;
}

function ToggleField({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return <label className="flex items-center justify-between gap-2 text-sm text-muted">{label}<select className={`${adminInput} max-w-28`} name={name} defaultValue={String(checked)}><option value="true">Activé</option><option value="false">Désactivé</option></select></label>;
}

async function Audit() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { displayName: true, email: true } } },
  });
  return (
    <>
      <AdminHeading eyebrow="Traçabilité" title="Journal d’audit" description="Les opérations sensibles sont conservées avec leur auteur, leur date et leurs métadonnées. Les 100 dernières entrées sont affichées." />
      <AdminPanel title="Actions récentes">
        <AdminTable><thead><tr><AdminTh>Date</AdminTh><AdminTh>Administrateur</AdminTh><AdminTh>Action</AdminTh><AdminTh>Entité</AdminTh><AdminTh>Détails</AdminTh></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.id} className="border-b border-line last:border-0">
            <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">{date(log.createdAt)}</td>
            <td className="px-3 py-3 text-sm">{log.actor?.displayName ?? log.actor?.email ?? "Système"}</td>
            <td className="px-3 py-3 font-medium">{log.action}</td><td className="px-3 py-3 text-muted">{log.entity}</td>
            <td className="max-w-72 truncate px-3 py-3 font-mono text-xs text-muted" title={JSON.stringify(log.meta)}>{JSON.stringify(log.meta ?? {})}</td>
          </tr>)}</tbody>
        </AdminTable>
      </AdminPanel>
    </>
  );
}
