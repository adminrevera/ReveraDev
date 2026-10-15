import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanTier, Role } from "@prisma/client";
import {
  createEvent,
  createQuest,
  publishAnnouncement,
  replyToSupportTicket,
  setStudentSuspended,
  updateAiBudget,
  updatePlanPrice,
  updateQuizValidationPercent,
  updateReadingMinimum,
  updateTierLimits,
} from "@/app/admin/actions";
import AdminShell, { AdminHeading, AdminPanel, adminButton, adminInput } from "@/components/admin/AdminShell";
import AccessKeyGenerator from "@/components/admin/AccessKeyGenerator";
import AdminAssistant from "@/components/admin/AdminAssistant";
import Gamification from "@/app/admin/sections/Gamification";
import Overview from "@/app/admin/sections/Overview";
import Relecture from "@/app/admin/sections/Relecture";
import Studio from "@/app/admin/sections/Studio";
import { requireAdminPage } from "@/lib/auth/access";
import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getReadingMinimumSeconds, MAX_READING_MIN_SECONDS } from "@/lib/reading-settings";
import { getQuizValidationPercent } from "@/lib/quiz-settings";

export const metadata: Metadata = { title: `Administration · ${APP_NAME}` };

const sections = new Set(["overview", "review", "studio", "gamification", "assistant", "content", "students", "payments", "operations", "settings", "audit"]);
const money = (amount: number) => new Intl.NumberFormat("fr-FR").format(amount);
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
const tierNames: Record<PlanTier, string> = { FREE: "Gratuit", PLUS: "Plus", SUCCESS: "Réussite" };

function SectionLoading() {
  return <div className="grid gap-4" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-line bg-bg2/60" />)}</div>;
}

function AdminTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[680px] text-left text-sm">{children}</table></div>;
}

function AdminTh({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-line bg-bg2 px-3 py-2.5 text-xs font-medium text-muted">{children}</th>;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ section?: string; q?: string; status?: string; item?: string }> }) {
  await requireAdminPage();
  const params = await searchParams;
  const section = params.section && sections.has(params.section) ? params.section : "overview";
  const query = (params.q ?? "").trim().slice(0, 100);

  return (
    <AdminShell section={section}>
      {section === "overview" && <Suspense fallback={<SectionLoading />}><Overview /></Suspense>}
      {(section === "review" || section === "content") && <Suspense fallback={<SectionLoading />}><Relecture filter={params.status ?? ""} /></Suspense>}
      {section === "studio" && <Suspense fallback={<SectionLoading />}><Studio itemId={params.item ?? null} /></Suspense>}
      {section === "gamification" && <Suspense fallback={<SectionLoading />}><Gamification /></Suspense>}
      {section === "assistant" && (
        <>
          <AdminHeading eyebrow="Assistant" title="Assistant d’administration" description="Pose une question ou demande une action. Mode manuel : tu valides chaque action. Mode auto : l’assistant exécute (journalisé). Il ne publie jamais de contenu." />
          <AdminAssistant />
        </>
      )}
      {section === "students" && <Students query={query} />}
      {section === "payments" && <Payments />}
      {section === "operations" && <Operations />}
      {section === "settings" && <Settings />}
      {section === "audit" && <Audit />}
    </AdminShell>
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
    select: {
      id: true,
      email: true,
      displayName: true,
      createdAt: true,
      suspendedAt: true,
      level: { select: { name: true } },
      _count: { select: { attempts: true, payments: true, tickets: true } },
    },
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
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        createdAt: true,
        amountXof: true,
        status: true,
        method: true,
        provider: true,
        confirmedAt: true,
        user: { select: { displayName: true, email: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountXof: true } }),
  ]);
  return (
    <>
      <AdminHeading eyebrow="Facturation" title="Paiements" description="Suivi des paiements Mixx by Yas et Moov Money (Flooz). Le paiement est confirmé par le fournisseur (notification signée), puis l’étudiant saisit le code reçu par e-mail : l’abonnement s’active alors seul. Rien à valider ici." />
      <div className="mb-5 flex flex-wrap gap-2">{counts.map((entry) => <p key={entry.status} className="rounded-xl border border-line bg-panel px-4 py-3 text-sm"><b>{entry.status}</b> · {entry._count._all} · {money(entry._sum.amountXof ?? 0)} FCFA</p>)}</div>
      <AdminPanel title="Transactions récentes">
        <AdminTable><thead><tr><AdminTh>Date</AdminTh><AdminTh>Étudiant</AdminTh><AdminTh>Offre</AdminTh><AdminTh>Montant</AdminTh><AdminTh>Statut</AdminTh><AdminTh>Code e-mail</AdminTh><AdminTh>Canal</AdminTh></tr></thead>
          <tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-line last:border-0">
            <td className="px-3 py-3 text-muted">{date(payment.createdAt)}</td>
            <td className="px-3 py-3"><p>{payment.user.displayName ?? "Sans nom"}</p><p className="text-xs text-muted">{payment.user.email}</p></td>
            <td className="px-3 py-3">{payment.plan.name}</td><td className="px-3 py-3">{money(payment.amountXof)} FCFA</td>
            <td className="px-3 py-3">{payment.status}</td><td className="px-3 py-3 text-muted">{payment.confirmedAt ? "Saisi · abonnement actif" : "Non saisi"}</td><td className="px-3 py-3 text-muted">{payment.method ?? payment.provider}</td>
          </tr>)}</tbody>
        </AdminTable>
      </AdminPanel>
    </>
  );
}

async function Operations() {
  const [levels, events, quests, tickets, announcements] = await Promise.all([
    prisma.level.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, title: true, status: true } }),
    prisma.questDefinition.findMany({ orderBy: { title: "asc" }, take: 20, select: { id: true, title: true, active: true } }),
    prisma.supportTicket.findMany({ where: { status: "open" }, orderBy: { createdAt: "asc" }, take: 20, include: { user: { select: { displayName: true, email: true } } } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, audience: true, createdAt: true } }),
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
  const [plans, limits, budgetSetting, readingMinimumSeconds, quizValidationPercent, keys] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { tier: "asc" },
      select: { id: true, name: true, tier: true, durationDays: true, priceXof: true },
    }),
    prisma.tierLimits.findMany({
      orderBy: { tier: "asc" },
      select: {
        tier: true,
        dailyTrainingSessions: true,
        dailyGames: true,
        examsPerSubject: true,
        streakFreezesPerMonth: true,
        spacedReview: true,
        detailedExamCorrection: true,
        helpGroup: true,
      },
    }),
    prisma.appSetting.findUnique({ where: { key: "ai.monthlyBudgetUsd" }, select: { value: true } }),
    getReadingMinimumSeconds(),
    getQuizValidationPercent(),
    prisma.accessKey.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        code: true,
        plan: { select: { name: true } },
        usedBy: { select: { email: true } },
      },
    }),
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
          <AdminPanel title="Durée minimale de lecture">
            <form action={updateReadingMinimum} className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-48 flex-1 gap-1 text-xs text-muted">
                Secondes avant validation du chapitre
                <input className={adminInput} name="readingMinSeconds" type="number" min={0} max={MAX_READING_MIN_SECONDS} step={1} defaultValue={readingMinimumSeconds} required />
              </label>
              <button className={adminButton}>Enregistrer la durée</button>
            </form>
            <p className="mt-3 text-xs text-muted">La fin du cours reste nécessaire. 0 seconde désactive uniquement l’attente, pas le défilement jusqu’au bas. Maximum : {MAX_READING_MIN_SECONDS} secondes.</p>
          </AdminPanel>
          <AdminPanel title="Seuil de validation des quiz">
            <form action={updateQuizValidationPercent} className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-48 flex-1 gap-1 text-xs text-muted">
                Score minimum en pourcentage
                <input className={adminInput} name="quizValidationPercent" type="number" min={1} max={100} step={1} defaultValue={quizValidationPercent} required />
              </label>
              <button className={adminButton}>Enregistrer le seuil</button>
            </form>
            <p className="mt-3 text-xs text-muted">Le serveur applique ce seuil pour valider les chapitres. Valeur initiale : 100 %.</p>
          </AdminPanel>
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
    select: {
      id: true,
      createdAt: true,
      action: true,
      entity: true,
      meta: true,
      actor: { select: { displayName: true, email: true } },
    },
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
