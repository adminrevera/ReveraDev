import { setFirstSubject } from "@/app/admin/studio-actions";
import AdminSubmitButton from "@/components/admin/AdminSubmitButton";
import { AdminHeading, AdminPanel, adminButton, adminInput } from "@/components/admin/AdminShell";
import ChapterEditor from "@/components/admin/ChapterEditor";
import DeriveButton from "@/components/admin/DeriveButton";
import { prisma } from "@/lib/prisma";

const statusLabel: Record<string, string> = { AI_DRAFT: "brouillon", IN_REVIEW: "en relecture", APPROVED: "approuvé", PUBLISHED: "publié", ARCHIVED: "archivé" };

export default async function Studio({ itemId }: { itemId: string | null }) {
  if (itemId && /^[0-9a-f-]{36}$/i.test(itemId)) {
    const item = await prisma.contentItem.findUnique({
      where: { id: itemId },
      select: {
        id: true, number: true, kind: true,
        subject: { select: { name: true } },
        versions: { orderBy: { version: "desc" }, take: 1, select: { version: true, status: true, title: true, subtitle: true, bodyHtml: true, questions: { select: { type: true } } } },
      },
    });
    const latest = item?.versions[0];
    if (item && latest && item.kind === "CHAPTER") {
      return (
        <>
          <AdminHeading eyebrow="Studio" title="Éditer un chapitre" description="Modifie le texte, importe un fichier, ajoute des questions. L’aperçu à droite est le rendu étudiant. L’enregistrement crée une version à relire." />
          <p className="mb-4"><a className="text-sm text-muted underline" href="/admin?section=studio">← Retour aux matières</a></p>
          <ChapterEditor
            itemId={item.id} subject={item.subject.name} number={item.number} version={latest.version} status={latest.status}
            title={latest.title} subtitle={latest.subtitle ?? ""} bodyHtml={latest.bodyHtml ?? ""}
            formats={Array.from(new Set(latest.questions.map((question) => question.type)))}
          />
        </>
      );
    }
  }

  const [subjects, setting] = await Promise.all([
    prisma.subject.findMany({
      orderBy: [{ level: { position: "asc" } }, { semester: { sort: "asc", nulls: "last" } }, { position: "asc" }],
      select: {
        id: true, name: true, semester: true, level: { select: { name: true } },
        items: {
          where: { kind: "CHAPTER" }, orderBy: { number: "asc" },
          select: { id: true, number: true, title: true, publishedVersionId: true, versions: { orderBy: { version: "desc" }, take: 1, select: { status: true, version: true } } },
        },
      },
    }),
    prisma.appSetting.findUnique({ where: { key: "onboarding.firstSubjectId" }, select: { value: true } }),
  ]);
  const firstSubjectId = typeof setting?.value === "string" ? setting.value : "";
  return (
    <>
      <AdminHeading eyebrow="Studio" title="Matières et chapitres" description="Le premier chapitre d’une matière est son chapitre publié de plus petit numéro. La première matière est celle que les nouveaux étudiants ouvrent en premier." />
      <AdminPanel title="Première matière (bienvenue)">
        <form action={setFirstSubject} className="flex flex-wrap gap-2">
          <select name="subjectId" defaultValue={firstSubjectId} className={`${adminInput} sm:max-w-md`} aria-label="Première matière">
            <option value="">Automatique (première du niveau)</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.level.name}</option>)}
          </select>
          <AdminSubmitButton className={adminButton}>Enregistrer</AdminSubmitButton>
        </form>
      </AdminPanel>
      <div className="mt-5 grid gap-4">
        {subjects.map((subject) => {
          const first = subject.items.find((item) => item.publishedVersionId);
          return (
            <AdminPanel key={subject.id} title={`${subject.name}${subject.id === firstSubjectId ? " · première matière" : ""}`}>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span>{subject.level.name}{subject.semester ? ` · semestre ${subject.semester}` : ""} · {subject.items.length} chapitre(s)</span>
                <span className={first ? "text-accent" : "text-amber"}>{first ? `Premier chapitre : ${first.number}. ${first.title}` : "Aucun chapitre publié : pas de premier cours défini"}</span>
                <DeriveButton subjectId={subject.id} label="Compléter les formats de la matière" />
              </div>
              <ul className="divide-y divide-line">
                {subject.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span>{item.number}. {item.title}{first?.id === item.id && <b className="ml-2 rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-medium text-accent">premier chapitre</b>}</span>
                    <span className="flex items-center gap-3 text-xs text-muted">
                      {item.versions[0] ? `v${item.versions[0].version} · ${statusLabel[item.versions[0].status] ?? item.versions[0].status}` : "sans version"}
                      <a className="underline" href={`/admin?section=studio&item=${item.id}`}>Éditer</a>
                    </span>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          );
        })}
      </div>
    </>
  );
}
