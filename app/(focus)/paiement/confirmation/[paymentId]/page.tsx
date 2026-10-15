import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CodeConfirmForm } from "@/components/student/PaymentFlow";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Confirmation · Revera" };

export default async function PaymentConfirmationPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { paymentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) notFound();
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId: profile.id }, select: { status: true, confirmedAt: true } });
  if (!payment) notFound();
  if (payment.confirmedAt) redirect("/abonnement?active=1");
  if (payment.status !== "PAID") redirect(`/paiement/statut/${paymentId}`);
  return <CodeConfirmForm paymentId={paymentId} />;
}
