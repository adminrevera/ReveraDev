import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketReplyForm } from "@/components/student/SupportForms";
import { PageHeader } from "@/components/student/ui";
import { requireStudentProfile } from "@/lib/auth/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ma demande · Revera" };

export default async function TicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { profile } = await requireStudentProfile();
  const { ticketId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) notFound();
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: profile.id },
    select: { subject: true, message: true, status: true, createdAt: true, messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, fromStaff: true, createdAt: true } } },
  });
  if (!ticket) notFound();
  const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const thread = [{ id: "first", body: ticket.message, fromStaff: false, createdAt: ticket.createdAt }, ...ticket.messages];
  return (
    <>
      <PageHeader eyebrow={ticket.status === "open" ? "Demande ouverte" : "Demande résolue"} title={ticket.subject}>
        <Link href="/aide" className="text-accent no-underline">← Aide et support</Link>
      </PageHeader>
      <div className="grid max-w-2xl gap-3">
        {thread.map((message) => (
          <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.fromStaff ? "bg-bg2" : "ml-auto bg-accent/[.14]"}`}>
            <p className="text-[11px] font-semibold text-amber">{message.fromStaff ? "Équipe Astyns" : "Toi"}</p>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{message.body}</p>
            <p className="mt-1 text-[10px] text-muted">{fmt.format(message.createdAt)}</p>
          </div>
        ))}
        <div className="mt-3"><TicketReplyForm ticketId={ticketId} /></div>
      </div>
    </>
  );
}
