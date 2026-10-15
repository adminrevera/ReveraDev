import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentFlow } from "@/components/student/PaymentFlow";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Paiement · Revera" };

export default async function PayPage({ params, searchParams }: { params: Promise<{ planSlug: string }>; searchParams: Promise<{ operator?: string; phone?: string }> }) {
  await requireStudentProfile();
  const { planSlug } = await params;
  const { operator, phone } = await searchParams;
  const plan = await prisma.plan.findFirst({ where: { slug: planSlug, active: true }, select: { slug: true, name: true, priceXof: true, durationDays: true } });
  if (!plan) notFound();
  return <PaymentFlow plan={plan} initialOperator={operator} initialPhone={phone} />;
}
