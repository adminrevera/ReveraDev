import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HelpChat from "@/components/student/HelpChat";
import { PageHeader } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Entraide · Revera" };

export default async function HelpGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { groupId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  const group = await prisma.helpGroup.findFirst({
    where: { id: groupId, OR: [{ subjectId: null }, { subject: { levelId: profile.levelId ?? "" } }], members: { some: { userId: profile.id } } },
    select: { id: true, name: true },
  });
  if (!group) notFound();
  return (
    <>
      <PageHeader eyebrow="Entraide" title={group.name}>
        <Link href="/entraide" className="text-accent no-underline">← Tous les groupes</Link>
      </PageHeader>
      <HelpChat groupId={group.id} />
    </>
  );
}
