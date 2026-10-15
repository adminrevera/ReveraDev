"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  cancelPayment, confirmPaymentCode, getPaymentStatus, resendPaymentCode, simulatePaymentOutcome, startPayment, type PaymentView,
} from "@/app/actions/payment";
import FocusTopBar from "@/components/student/FocusTopBar";

const primary = "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-6 text-[15px] font-semibold text-accent-ink no-underline transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";
const secondary = "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-panel px-6 text-[15px] font-semibold text-fg no-underline transition hover:border-accent/40 disabled:opacity-50";
const operators = [{ id: "mixx", label: "Mixx by Yas" }, { id: "moov", label: "Moov Money (Flooz)" }] as const;

function Page({ title, subtitle, children, footer, exit = "/abonnement", percent }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; exit?: string; percent: number }) {
  return (
    <>
      <FocusTopBar exitHref={exit} exitLabel="Quitter le paiement" percent={percent} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-8 sm:px-6 sm:pt-10">
        <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </main>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto grid max-w-3xl gap-2">{footer}</div>
        </div>
      )}
    </>
  );
}

function Recap({ plan, operator, phone }: { plan: { name: string; priceXof: number; durationDays: number }; operator: string; phone: string }) {
  const label = operators.find((entry) => entry.id === operator)?.label ?? "—";
  const rows: [string, string][] = [
    ["Formule", plan.name],
    ["Durée", `${plan.durationDays} jours`],
    ["Opérateur", label],
    ["Numéro", phone ? phone.replace(/(\d{2})(?=\d)/g, "$1 ") : "—"],
  ];
  return (
    <section className="rounded-2xl border border-line bg-panel p-5" aria-label="Récapitulatif du paiement">
      <p className="font-mono text-[10px] uppercase tracking-[.16em] text-amber">Récapitulatif</p>
      <dl className="mt-3 grid gap-2.5 text-sm">
        {rows.map(([name, value]) => (
          <div key={name} className="flex justify-between gap-4"><dt className="text-muted">{name}</dt><dd className="text-right font-medium">{value}</dd></div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t border-line pt-3 text-base"><dt>Montant à payer</dt><dd className="font-semibold text-accent">{plan.priceXof.toLocaleString("fr-FR")} FCFA</dd></div>
      </dl>
    </section>
  );
}

// Écrans 1 et 2 : choix de l'opérateur et du numéro, puis récapitulatif. Sur grand écran les deux sont affichés ensemble.
export function PaymentFlow({ plan, initialOperator, initialPhone }: { plan: { slug: string; name: string; priceXof: number; durationDays: number }; initialOperator?: string; initialPhone?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "recap">("form");
  const [operator, setOperator] = useState<string>(initialOperator === "moov" || initialOperator === "mixx" ? initialOperator : "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const digits = phone.replace(/\D/g, "").replace(/^228/, "");
  const valid = Boolean(operator) && digits.length === 8;

  function pay() {
    setError(null);
    start(async () => {
      const result = await startPayment({ planSlug: plan.slug, operator: operator as "mixx" | "moov", phone: digits });
      if (result.error !== null) { setError(result.error); setStep("form"); return; }
      router.push(`/paiement/statut/${result.paymentId}`);
    });
  }

  const form = (
    <div className="grid gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Choisis ton opérateur</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {operators.map((entry) => (
            <label key={entry.id} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-[15px] font-medium transition ${operator === entry.id ? "border-accent bg-accent/[.10] shadow-[inset_0_0_0_1px_var(--accent)]" : "border-line bg-panel hover:border-accent/40"}`}>
              <input type="radio" name="operator" checked={operator === entry.id} onChange={() => setOperator(entry.id)} className="sr-only" />
              <span aria-hidden="true" className={`size-4 rounded-full border-2 ${operator === entry.id ? "border-accent bg-accent" : "border-line"}`} />
              {entry.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2 text-sm font-medium">
        Numéro de téléphone
        <input
          type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="90 12 34 56"
          className="min-h-14 w-full rounded-2xl border border-line bg-panel px-4 text-[17px] tabular-nums outline-none transition focus:border-accent/70"
        />
        <span className="text-xs font-normal text-muted">8 chiffres, sans l’indicatif. Tu recevras une demande de confirmation sur ce numéro.</span>
      </label>
    </div>
  );

  return (
    <Page
      title={step === "form" ? "Comment veux-tu payer ?" : "Vérifie avant de payer"}
      subtitle={step === "form" ? "Paiement par mobile money." : "Un code de confirmation te sera envoyé par e-mail une fois le paiement reçu."}
      percent={step === "form" ? 25 : 50}
      footer={
        <>
          {error && <p className="text-center text-sm text-warn" role="alert">{error}</p>}
          {step === "form" ? (
            <>
              <button type="button" disabled={!valid} onClick={() => setStep("recap")} className={`${primary} lg:hidden`}>Continuer</button>
              <button type="button" disabled={!valid || pending} onClick={pay} className={`${primary} hidden lg:inline-flex`}>{pending ? "Envoi de la demande…" : "Confirmer et payer"}</button>
            </>
          ) : (
            <>
              <button type="button" disabled={pending} onClick={pay} className={primary}>{pending ? "Envoi de la demande…" : "Confirmer et payer"}</button>
              <button type="button" disabled={pending} onClick={() => setStep("form")} className={secondary}>Retour</button>
            </>
          )}
        </>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className={step === "recap" ? "hidden lg:block" : ""}>{form}</div>
        <div className={step === "form" ? "hidden lg:block" : ""}><Recap plan={plan} operator={operator} phone={digits} /></div>
      </div>
    </Page>
  );
}

// Écran 3 : état du paiement (en attente, annulé, échoué, réussi).
export function PaymentStatusView({ paymentId, plan }: { paymentId: string; plan: { name: string; priceXof: number } }) {
  const router = useRouter();
  const [view, setView] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refresh = useCallback(async () => {
    const result = await getPaymentStatus(paymentId);
    if ("error" in result) setError(result.error);
    else setView(result);
    return result;
  }, [paymentId]);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      const result = await refresh();
      if (stopped || "error" in result || result.status !== "PENDING") return;
      timer = window.setTimeout(tick, 4000);
    };
    let timer = window.setTimeout(tick, 0);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [refresh]);

  const retryHref = view ? `/paiement/${view.planSlug}?operator=${view.operator ?? ""}&phone=${view.phone ?? ""}` : "/abonnement";

  if (error) return <Page title="Paiement introuvable" percent={0} footer={<Link href="/abonnement" className={primary}>Voir les offres</Link>}><p className="text-sm text-muted">{error}</p></Page>;
  if (!view) return <Page title="Vérification du paiement…" percent={50}><p className="text-sm text-muted">Un instant.</p></Page>;

  if (view.status === "PENDING") {
    return (
      <Page title="Paiement en attente" subtitle="Nous avons envoyé la demande de paiement sur ton téléphone. Confirme-la en saisissant ton code secret." percent={65}
        footer={<button type="button" disabled={pending} onClick={() => start(async () => { await cancelPayment(paymentId); await refresh(); })} className={secondary}>Annuler le paiement</button>}>
        <div className="rounded-2xl border border-line bg-panel p-5 text-sm leading-relaxed">
          <p className="flex items-center gap-3"><span className="size-3 animate-pulse rounded-full bg-amber" aria-hidden="true" />En attente de la confirmation de l’opérateur…</p>
          <p className="mt-3 text-muted">{plan.name} · {plan.priceXof.toLocaleString("fr-FR")} FCFA. Cette page se met à jour toute seule.</p>
        </div>
        {view.sandbox && (
          <div className="mt-5 rounded-2xl border border-dashed border-amber/40 p-4 text-sm">
            <p className="font-semibold text-amber">Mode simulation</p>
            <p className="mt-1 text-xs text-muted">Aucun vrai paiement n’est lancé. Choisis le résultat à simuler :</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["success", "cancel", "fail"] as const).map((outcome) => (
                <button key={outcome} type="button" disabled={pending} onClick={() => start(async () => { await simulatePaymentOutcome(paymentId, outcome); await refresh(); })} className="rounded-full border border-line px-4 py-2 text-xs font-semibold hover:border-accent/50">
                  {outcome === "success" ? "Paiement réussi" : outcome === "cancel" ? "Paiement annulé" : "Paiement échoué"}
                </button>
              ))}
            </div>
          </div>
        )}
      </Page>
    );
  }
  if (view.status === "CANCELED" || view.status === "FAILED") {
    const canceled = view.status === "CANCELED";
    return (
      <Page title={canceled ? "Paiement annulé" : "Paiement échoué"} percent={65}
        subtitle={canceled ? "Le paiement a été annulé. Tu n’as pas été débité." : "Le paiement n’a pas abouti. Vérifie ton solde et ton numéro, puis réessaie."}
        footer={<><Link href={retryHref} className={primary}>Réessayer</Link><Link href="/abonnement" className={secondary}>Voir les offres</Link></>}>
        <p className="text-sm text-muted">Si de l’argent a été débité malgré tout, écris-nous depuis « Aide et support » avec l’heure du paiement.</p>
      </Page>
    );
  }
  return (
    <Page title="Paiement réussi" percent={85}
      subtitle="Un code de confirmation a été envoyé à ton adresse e-mail. Saisis-le pour activer ton abonnement."
      footer={view.confirmed
        ? <Link href="/dashboard" className={primary}>Aller à l’accueil</Link>
        : <button type="button" className={primary} onClick={() => router.push(`/paiement/confirmation/${paymentId}`)}>Saisir le code</button>}>
      <p className="rounded-2xl border border-line bg-panel p-5 text-sm leading-relaxed text-muted">
        Cette étape protège ton compte : l’abonnement ne s’active qu’avec le code reçu sur ton e-mail, même si un paiement part par erreur.
      </p>
    </Page>
  );
}

// Écran 4 : confirmation par code.
export function CodeConfirmForm({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function verify() {
    setError(null);
    start(async () => {
      const result = await confirmPaymentCode(paymentId, code);
      if (result.error) { setError(result.error); return; }
      router.replace("/abonnement?active=1");
    });
  }

  return (
    <Page title="Confirme avec ton code" subtitle="Un code de confirmation a été envoyé à ton adresse e-mail." percent={95}
      footer={<button type="button" disabled={code.length !== 6 || pending} onClick={verify} className={primary}>{pending ? "Vérification…" : "Vérifier le code"}</button>}>
      <div className="grid max-w-sm gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Code à 6 chiffres
          <input
            inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="min-h-16 rounded-2xl border border-line bg-panel px-4 text-center text-3xl font-semibold tracking-[.4em] tabular-nums outline-none focus:border-accent/70" placeholder="000000"
          />
        </label>
        {error && <p className="text-sm text-warn" role="alert">{error}</p>}
        {message && <p className="text-sm text-accent" role="status">{message}</p>}
        <button
          type="button" disabled={cooldown > 0 || pending}
          onClick={() => start(async () => { const result = await resendPaymentCode(paymentId); if (result.error) setError(result.error); else { setError(null); setMessage("Un nouveau code vient d’être envoyé."); setCooldown(60); } })}
          className="text-left text-sm text-muted underline underline-offset-4 disabled:no-underline disabled:opacity-60"
        >
          {cooldown > 0 ? `Renvoyer le code dans ${cooldown} s` : "Renvoyer le code"}
        </button>
      </div>
    </Page>
  );
}
