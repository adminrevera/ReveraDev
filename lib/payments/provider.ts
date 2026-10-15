import { createHash } from "node:crypto";

// Passerelle de paiement mobile money (PayDunya). Deux modes :
//   - "sandbox" (par défaut, ou si les clés PayDunya manquent) : aucun appel externe ; le paiement se simule depuis l'écran d'état.
//   - "live" : PAYMENT_MODE=live + PAYDUNYA_MASTER_KEY / PAYDUNYA_PRIVATE_KEY / PAYDUNYA_TOKEN.
//
// ⚠ À VÉRIFIER contre la documentation PayDunya avant la mise en production : les adresses d'API Togo (Mixx by Yas / Moov)
// et les noms de champs ci-dessous sont ceux de PayDunya SoftPay tels que connus ; ils n'ont pas pu être testés ici.

export type Operator = "mixx" | "moov";
export const OPERATORS: { id: Operator; label: string }[] = [
  { id: "mixx", label: "Mixx by Yas" },
  { id: "moov", label: "Moov Money (Flooz)" },
];

export function paymentMode(): "sandbox" | "live" {
  const configured = process.env.PAYMENT_MODE === "live";
  const keys = process.env.PAYDUNYA_MASTER_KEY && process.env.PAYDUNYA_PRIVATE_KEY && process.env.PAYDUNYA_TOKEN;
  return configured && keys ? "live" : "sandbox";
}

const BASE = process.env.PAYDUNYA_BASE_URL ?? "https://app.paydunya.com/api/v1";

function headers() {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY ?? "",
    "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
    "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN ?? "",
  };
}

export type InitResult = { ok: true; token: string | null } | { ok: false; message: string };

/** Crée la facture puis envoie la demande de paiement sur le téléphone du client. */
export async function initiateMobilePayment(input: {
  amountXof: number; planName: string; operator: Operator; phone: string; customerName: string; email: string; reference: string; callbackUrl: string;
}): Promise<InitResult> {
  if (paymentMode() === "sandbox") return { ok: true, token: `sandbox_${input.reference}` };
  try {
    const invoice = await fetch(`${BASE}/checkout-invoice/create`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        invoice: { total_amount: input.amountXof, description: `Abonnement ${input.planName}` },
        store: { name: "Astyns" },
        actions: { callback_url: input.callbackUrl },
        custom_data: { reference: input.reference },
      }),
    });
    const invoiceBody = (await invoice.json()) as { response_code?: string; token?: string; response_text?: string };
    if (invoiceBody.response_code !== "00" || !invoiceBody.token) return { ok: false, message: "La facture n’a pas pu être créée." };

    const path = input.operator === "mixx" ? "softpay/t-money-togo" : "softpay/moov-togo";
    const pay = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        phone_number: input.phone.replace(/\D/g, "").replace(/^228/, ""),
        customer_name: input.customerName,
        customer_email: input.email,
        invoice_token: invoiceBody.token,
      }),
    });
    const payBody = (await pay.json()) as { success?: boolean; message?: string };
    if (!payBody.success) return { ok: false, message: payBody.message ?? "L’opérateur a refusé la demande." };
    return { ok: true, token: invoiceBody.token };
  } catch (error) {
    console.error("PayDunya initiate failed:", error);
    return { ok: false, message: "La passerelle de paiement ne répond pas. Réessaie dans un instant." };
  }
}

export type RemoteStatus = "pending" | "completed" | "cancelled" | "failed";

/** Interroge PayDunya sur l'état d'une facture. */
export async function fetchPaymentStatus(token: string): Promise<RemoteStatus> {
  if (paymentMode() === "sandbox") return "pending";
  try {
    const response = await fetch(`${BASE}/checkout-invoice/confirm/${encodeURIComponent(token)}`, { headers: headers(), cache: "no-store" });
    const body = (await response.json()) as { status?: string };
    if (body.status === "completed") return "completed";
    if (body.status === "cancelled") return "cancelled";
    if (body.status === "failed") return "failed";
    return "pending";
  } catch {
    return "pending";
  }
}

/** Vérifie l'empreinte envoyée par PayDunya dans la notification (sha512 de la clé maître). */
export function isValidIpnHash(hash: unknown) {
  const master = process.env.PAYDUNYA_MASTER_KEY;
  if (!master || typeof hash !== "string") return false;
  return createHash("sha512").update(master).digest("hex") === hash;
}
