import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// Code de confirmation à 6 chiffres envoyé par e-mail après un paiement réussi. Seule son empreinte est stockée.
export const CODE_TTL_MS = 30 * 60_000;
export const CODE_RESEND_COOLDOWN_MS = 60_000;
export const CODE_MAX_ATTEMPTS = 5;

function secret() {
  return process.env.PAYMENT_CODE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PAYDUNYA_MASTER_KEY ?? "dev-only-change-me";
}

export function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(paymentId: string, code: string) {
  return createHmac("sha256", secret()).update(`${paymentId}:${code}`).digest("hex");
}

export function codeMatches(paymentId: string, code: string, storedHash: string) {
  const candidate = Buffer.from(hashCode(paymentId, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
