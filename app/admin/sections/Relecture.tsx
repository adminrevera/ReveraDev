import { reviewContent } from "@/app/admin/actions";
import AdminSubmitButton from "@/components/admin/AdminSubmitButton";
import { AdminHeading, AdminPanel, adminButton } from "@/components/admin/AdminShell";
import DeriveButton from "@/components/admin/DeriveButton";
import VersionPreview from "@/components/admin/VersionPreview";
import { prisma } from "@/lib/prisma";

const date = (value: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
const statusLabel: Record<string, string> = { AI_DRAFT: "Brouillon", IN_REVIEW: "En relecture", APPROVED: "Approuvée" };
const originLabel: Record<string, string> = { import: "Import", studio: "Studio", manuel: "Manuel", derive: "Formats dérivés", ai: "IA" };

export default async function Relecture({ filter }: { filter: string }) {
  const status = filter === "AI_DRAFT" || filter === "IN_REVIEW" || filter === "APPROVED" ? filter : null;
  const [versions, counts] = await Promise.all([
    prisma.contentVersion.findMany({
      where: { status: status ? status : { in: ["AI_DRAFT", "IN_REVIEW", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true, itemId: true, version: true, status: true, origin: true, title: true, note: true, createdAt: true,
        item: { select: { kind: true, number: true, subject: { select: { name: true, level: { select: { name: true } } } } } },
        _count: { select: { questions: true } },
      },
    }),
    prisma.contentVersion.groupBy({ by: ["status"], where: { status: { in: ["AI_DRAFT", "IN_REVIEW", "APPROVED"] } }, _count: { _all: true } }),
  ]);
  const total = counts.reduce((sum, entry) => sum + entry._count._all, 0);
  const tabs: [string, string, number][] = [
    ["", "Tout", total],
    ...(["IN_REVIEW", "APPROVED", "AI_DRAFT"] as const).map((id): [string, string, number] => [id, statusLabel[id], counts.find((entry) => entry.status === id)?._count._all ?? 0]),
  ];
  return (
    <>
      <AdminHeading eyebrow="Relecture" title="Relire et publier" description="Chaque version se relit comme l’étudiant la verra (cours par parties, questions et corrigé). Rien n’est publié sans ton approbation explicite." />
      <nav aria-label="Filtrer" className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([id, label, count]) => (
          <a key={id || "all"} href={id ? `/admin?section=review&status=${id}` : "/admin?section=review"} aria-current={(status ?? "") === id ? "page" : undefined}
            className={`rounded-full border px-3.5 py-2 text-xs no-underline ${(status ?? "") === id ? "border-accent/50 bg-accent/[.12] font-semibold text-fg" : "border-line text-muted"}`}>
            {label} · {count}
          </a>
        ))}
      </nav>
      <AdminPanel title={`Versions · ${versions.length}`}>
        <div className="grid gap-4">
          {versions.length === 0 && <p className="text-sm text-muted">Rien à relire. Bravo.</p>}
          {versions.map((version) => (
            <article key={version.id} className="rounded-xl border border-line bg-bg2/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-amber">{statusLabel[version.status] ?? version.status} · v{version.version} · {originLabel[version.origin] ?? version.origin}</p>
                  <h3 className="mt-1 font-semibold">{version.title}</h3>
                  <p className="mt-1 text-xs text-muted">{version.item.subject.name} · {version.item.subject.level.name} · chapitre {version.item.number} · {version._count.questions} question(s) · {date(version.createdAt)}</p>
                  {version.note && <p className="mt-2 text-sm text-muted">{version.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={reviewContent}><input type="hidden" name="versionId" value={version.id} /><AdminSubmitButton className={adminButton} name="action" value="approve" disabled={version.status === "APPROVED"}>Approuver</AdminSubmitButton></form>
                  <form action={reviewContent}><input type="hidden" name="versionId" value={version.id} /><AdminSubmitButton className={adminButton} name="action" value="publish" disabled={version.status !== "APPROVED"}>Publier</AdminSubmitButton></form>
                  {version.item.kind === "CHAPTER" && <a className={`${adminButton} no-underline`} href={`/admin?section=studio&item=${version.itemId}`}>Modifier</a>}
                </div>
              </div>
              <VersionPreview versionId={version.id} />
              {version.item.kind === "CHAPTER" && <div className="mt-3"><DeriveButton itemId={version.itemId} /></div>}
            </article>
          ))}
        </div>
      </AdminPanel>
    </>
  );
}
