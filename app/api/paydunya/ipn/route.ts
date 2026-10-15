import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { markPaymentPaid } from "@/app/actions/payment";
import { fetchPaymentStatus, isValidIpnHash } from "@/lib/payments/provider";
import { prisma } from "@/lib/prisma";

// Notification serveur de PayDunya (IPN). On vérifie l'empreinte puis on re-confirme la facture auprès de PayDunya
// avant de marquer le paiement comme payé : une requête forgée ne suffit pas.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let payload: Record<string, unknown> = {};
  try {
    if (contentType.includes("application/json")) payload = await request.json();
    else {
      const form = await request.formData();
      const raw = form.get("data");
      payload = typeof raw === "string" ? JSON.parse(raw) : Object.fromEntries(form.entries());
    }
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const data = (payload.data ?? payload) as { hash?: unknown; invoice?: { token?: unknown }; status?: unknown };
  if (!isValidIpnHash(data.hash)) return NextResponse.json({ error: "Empreinte invalide" }, { status: 401 });
  const token = typeof data.invoice?.token === "string" ? data.invoice.token : null;
  if (!token) return NextResponse.json({ error: "Jeton manquant" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { providerToken: token }, select: { id: true } });
  if (!payment) return NextResponse.json({ ok: true });
  await prisma.payment.update({ where: { id: payment.id }, data: { rawCallback: payload as Prisma.InputJsonObject } });
  const remote = await fetchPaymentStatus(token);
  if (remote === "completed") await markPaymentPaid(payment.id);
  else if (remote === "cancelled") await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "CANCELED" } });
  else if (remote === "failed") await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
  return NextResponse.json({ ok: true });
}
