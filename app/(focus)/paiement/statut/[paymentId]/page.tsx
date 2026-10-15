import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentStatusView } from "@/components/student/PaymentFlow";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "État du paiement · Revera" };

export default async function PaymentStatusPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { paymentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) notFound();
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId: profile.id }, select: { plan: { select: { name: true, priceXof: true } } } });
  if (!payment) notFound();
  return <PaymentStatusView paymentId={paymentId} plan={payment.plan} />;
}
