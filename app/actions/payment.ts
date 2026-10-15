"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireStudentProfile } from "@/lib/auth/access";
import { sendEmail } from "@/lib/email";
import { CODE_MAX_ATTEMPTS, CODE_RESEND_COOLDOWN_MS, CODE_TTL_MS, codeMatches, generateCode, hashCode } from "@/lib/payments/code";
import { fetchPaymentStatus, initiateMobilePayment, paymentMode } from "@/lib/payments/provider";
import { prisma } from "@/lib/prisma";

const PENDING_TIMEOUT_MS = 10 * 60_000;

// Les numéros togolais : 8 chiffres (Mixx by Yas : 90–93, 70–79 ; Moov : 96–99, 79). Le préfixe exact n'est pas vérifié ici : l'opérateur tranche.
const phoneSchema = z.string().trim().transform((value) => value.replace(/[\s.-]/g, "").replace(/^(\+?228)/, "")).pipe(z.string().regex(/^\d{8}$/, "Le numéro doit comporter 8 chiffres."));

export async function startPayment(input: { planSlug: string; operator: "mixx" | "moov"; phone: string }) {
  const { profile } = await requireStudentProfile();
  const parsed = z.object({ planSlug: z.string().min(1).max(80), operator: z.enum(["mixx", "moov"]), phone: phoneSchema }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vérifie les informations saisies." } as const;
  const plan = await prisma.plan.findFirst({ where: { slug: parsed.data.planSlug, active: true } });
  if (!plan) return { error: "Cette formule n’est plus disponible." } as const;

  const recent = await prisma.payment.count({ where: { userId: profile.id, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 5) return { error: "Trop de tentatives. Patiente quelques minutes avant de réessayer." } as const;

  const payment = await prisma.payment.create({
    data: { userId: profile.id, planId: plan.id, method: parsed.data.operator, phone: parsed.data.phone, amountXof: plan.priceXof, provider: "paydunya" },
    select: { id: true },
  });
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const result = await initiateMobilePayment({
    amountXof: plan.priceXof, planName: plan.name, operator: parsed.data.operator, phone: parsed.data.phone,
    customerName: profile.displayName ?? "Étudiant", email: profile.email, reference: payment.id, callbackUrl: `${origin}/api/paydunya/ipn`,
  });
  if (!result.ok) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { error: null, paymentId: payment.id } as const; // l'écran d'état affichera « échoué » avec le bouton Réessayer
  }
  if (result.token) await prisma.payment.update({ where: { id: payment.id }, data: { providerToken: result.token } });
  return { error: null, paymentId: payment.id } as const;
}

async function sendCode(payment: { id: string; user: { email: string } }) {
  const code = generateCode();
  await prisma.payment.update({ where: { id: payment.id }, data: { codeHash: hashCode(payment.id, code), codeSentAt: new Date(), codeAttempts: 0 } });
  await sendEmail({
    to: payment.user.email,
    subject: "Ton code de confirmation Astyns",
    text: `Voici ton code de confirmation : ${code}\n\nSaisis-le dans l'application pour activer ton abonnement. Il est valable 30 minutes.\nSi tu n'as pas fait ce paiement, ignore ce message et ne partage jamais ce code.`,
  });
}

/** Passe un paiement à « payé » (une seule fois) et envoie le code. Appelé par le suivi d'état et par la notification PayDunya. */
export async function markPaymentPaid(paymentId: string) {
  const changed = await prisma.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
  if (!changed.count) return;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, user: { select: { email: true } } } });
  if (payment) await sendCode(payment);
}

export type PaymentView = {
  status: "PENDING" | "PAID" | "FAILED" | "CANCELED";
  confirmed: boolean;
  sandbox: boolean;
  planSlug: string;
  operator: string | null;
  phone: string | null;
};

/** État d'un paiement pour l'écran d'attente. Interroge l'opérateur tant que le paiement est en attente. */
export async function getPaymentStatus(paymentIdInput: string): Promise<PaymentView | { error: string }> {
  const { profile } = await requireStudentProfile();
  const id = z.string().uuid().safeParse(paymentIdInput);
  if (!id.success) return { error: "Paiement introuvable." };
  let payment = await prisma.payment.findFirst({
    where: { id: id.data, userId: profile.id },
    select: { id: true, status: true, confirmedAt: true, providerToken: true, createdAt: true, method: true, phone: true, plan: { select: { slug: true } } },
  });
  if (!payment) return { error: "Paiement introuvable." };

  if (payment.status === "PENDING") {
    if (payment.providerToken && !payment.providerToken.startsWith("sandbox_")) {
      const remote = await fetchPaymentStatus(payment.providerToken);
      if (remote === "completed") await markPaymentPaid(payment.id);
      else if (remote === "cancelled") await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "CANCELED" } });
      else if (remote === "failed") await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
    }
    if (Date.now() - payment.createdAt.getTime() > PENDING_TIMEOUT_MS) {
      await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
    }
    payment = await prisma.payment.findFirst({
      where: { id: payment.id },
      select: { id: true, status: true, confirmedAt: true, providerToken: true, createdAt: true, method: true, phone: true, plan: { select: { slug: true } } },
    });
    if (!payment) return { error: "Paiement introuvable." };
  }
  return {
    status: payment.status, confirmed: payment.confirmedAt !== null, sandbox: paymentMode() === "sandbox",
    planSlug: payment.plan.slug, operator: payment.method, phone: payment.phone,
  };
}

export async function cancelPayment(paymentIdInput: string) {
  const { profile } = await requireStudentProfile();
  const id = z.string().uuid().safeParse(paymentIdInput);
  if (!id.success) return { error: "Paiement introuvable." };
  await prisma.payment.updateMany({ where: { id: id.data, userId: profile.id, status: "PENDING" }, data: { status: "CANCELED" } });
  return { error: null };
}

/** Mode simulation uniquement : permet de tester les 4 états sans opérateur. Refusé en mode live. */
export async function simulatePaymentOutcome(paymentIdInput: string, outcome: "success" | "cancel" | "fail") {
  const { profile } = await requireStudentProfile();
  if (paymentMode() !== "sandbox") return { error: "Disponible uniquement en mode simulation." };
  const id = z.string().uuid().safeParse(paymentIdInput);
  if (!id.success) return { error: "Paiement introuvable." };
  const payment = await prisma.payment.findFirst({ where: { id: id.data, userId: profile.id, status: "PENDING" }, select: { id: true } });
  if (!payment) return { error: "Ce paiement n’est plus en attente." };
  if (outcome === "success") await markPaymentPaid(payment.id);
  else await prisma.payment.update({ where: { id: payment.id }, data: { status: outcome === "cancel" ? "CANCELED" : "FAILED" } });
  return { error: null };
}

export async function resendPaymentCode(paymentIdInput: string) {
  const { profile } = await requireStudentProfile();
  const id = z.string().uuid().safeParse(paymentIdInput);
  if (!id.success) return { error: "Paiement introuvable." };
  const payment = await prisma.payment.findFirst({
    where: { id: id.data, userId: profile.id, status: "PAID", confirmedAt: null },
    select: { id: true, codeSentAt: true, user: { select: { email: true } } },
  });
  if (!payment) return { error: "Aucun code à renvoyer pour ce paiement." };
  if (payment.codeSentAt && Date.now() - payment.codeSentAt.getTime() < CODE_RESEND_COOLDOWN_MS) {
    return { error: "Un code vient d’être envoyé. Patiente une minute avant d’en demander un autre." };
  }
  await sendCode(payment);
  return { error: null };
}

/** Saisie du code : active l'abonnement sans aucune action de l'administration. */
export async function confirmPaymentCode(paymentIdInput: string, codeInput: string) {
  const { profile } = await requireStudentProfile();
  const parsed = z.object({ id: z.string().uuid(), code: z.string().trim().regex(/^\d{6}$/, "Le code comporte 6 chiffres.") }).safeParse({ id: paymentIdInput, code: codeInput });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Code invalide." };
  const payment = await prisma.payment.findFirst({
    where: { id: parsed.data.id, userId: profile.id, status: "PAID" },
    select: { id: true, codeHash: true, codeSentAt: true, codeAttempts: true, confirmedAt: true, plan: { select: { id: true, tier: true, durationDays: true } } },
  });
  if (!payment) return { error: "Paiement introuvable." };
  if (payment.confirmedAt) return { error: null };
  if (!payment.codeHash || !payment.codeSentAt) return { error: "Aucun code n’a été envoyé. Demande un nouveau code." };
  if (Date.now() - payment.codeSentAt.getTime() > CODE_TTL_MS) return { error: "Ce code a expiré. Demande un nouveau code." };
  if (payment.codeAttempts >= CODE_MAX_ATTEMPTS) return { error: "Trop d’essais. Demande un nouveau code." };

  if (!codeMatches(payment.id, parsed.data.code, payment.codeHash)) {
    await prisma.payment.update({ where: { id: payment.id }, data: { codeAttempts: { increment: 1 } } });
    return { error: `Code incorrect. Il te reste ${Math.max(0, CODE_MAX_ATTEMPTS - payment.codeAttempts - 1)} essai(s).` };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({ where: { id: payment.id, confirmedAt: null }, data: { confirmedAt: now, codeHash: null } });
    if (!claimed.count) return;
    const current = await tx.profile.findUnique({ where: { id: profile.id }, select: { tier: true, premiumUntil: true } });
    const base = current && current.tier === payment.plan.tier && current.premiumUntil && current.premiumUntil > now ? current.premiumUntil : now;
    const endsAt = new Date(base.getTime() + payment.plan.durationDays * 86_400_000);
    await tx.subscription.create({ data: { userId: profile.id, planId: payment.plan.id, paymentId: payment.id, startsAt: base, endsAt, source: "payment" } });
    await tx.profile.update({ where: { id: profile.id }, data: { tier: payment.plan.tier, premiumUntil: endsAt } });
    await tx.auditLog.create({ data: { actorId: profile.id, action: "subscription.activated", entity: "Payment", entityId: payment.id, meta: { planId: payment.plan.id, endsAt: endsAt.toISOString() } } });
  });
  revalidateTag("student-catalog");
  for (const path of ["/dashboard", "/profil", "/abonnement", "/entraide", "/reviser"]) revalidatePath(path);
  return { error: null };
}
