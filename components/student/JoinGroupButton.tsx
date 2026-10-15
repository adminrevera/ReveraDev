"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { joinHelpGroup } from "@/app/actions/community";

export default function JoinGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button" disabled={pending}
      onClick={() => start(async () => { await joinHelpGroup(groupId); router.push(`/entraide/${groupId}`); })}
      className="inline-flex min-h-10 items-center rounded-full border border-accent/40 px-4 text-sm font-semibold transition hover:bg-accent/[.08] disabled:opacity-50"
    >
      {pending ? "…" : "Rejoindre"}
    </button>
  );
}
