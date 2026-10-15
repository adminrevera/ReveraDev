import { QuestMetric } from "@prisma/client";
import { createQuest } from "@/app/admin/actions";
import AdminSubmitButton from "@/components/admin/AdminSubmitButton";
import { AdminHeading, AdminPanel, adminButton, adminInput } from "@/components/admin/AdminShell";
import { ActionButton, BadgeEditor, NumberSetting, QuestToggle } from "@/components/admin/GamificationControls";
import { leagueUnlockThreshold } from "@/lib/gamification/league";
import { prisma } from "@/lib/prisma";

const metricLabel: Record<QuestMetric, string> = {
  ANSWERS: "réponses", XP: "XP", CHAPTERS: "chapitres validés", CORRECT: "bonnes réponses", QUIZZES: "quiz terminés", REVIEWS: "révisions réussies", GAMES: "grilles de jeu",
};
const categoryLabel: Record<string, string> = { DISCOVERY: "Découverte", REGULARITY: "Régularité", MASTERY: "Maîtrise", COMPETITION: "Compétition", EVENT: "Événements" };

export default async function Gamification() {
  const [quests, badges, perDaySetting, threshold, todayCount] = await Promise.all([
    prisma.questDefinition.findMany({ orderBy: [{ metric: "asc" }, { target: "asc" }], select: { id: true, title: true, metric: true, target: true, rewardXp: true, active: true } }),
    prisma.badge.findMany({ orderBy: [{ category: "asc" }, { position: "asc" }], select: { id: true, name: true, description: true, category: true, _count: { select: { users: true } } } }),
    prisma.appSetting.findUnique({ where: { key: "quests.perDay" }, select: { value: true } }),
    leagueUnlockThreshold(),
    prisma.leagueMember.count(),
  ]);
  const perDay = typeof perDaySetting?.value === "number" ? perDaySetting.value : 3;
  const active = quests.filter((quest) => quest.active).length;
  return (
    <>
      <AdminHeading eyebrow="Gamification" title="Quêtes, badges et ligue" description="Réserve de quêtes (tirage automatique chaque jour), badges à débloquer et règle d’ouverture de la ligue." />
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel title="Ligue">
          <p className="mb-3 text-sm text-muted">La ligue s’ouvre pour un étudiant après N chapitres validés, tous cours confondus. {todayCount} participation(s) enregistrée(s).</p>
          <NumberSetting settingKey="league.unlockAfterChapters" label="Chapitres à valider" value={threshold} min={1} max={20} />
          <div className="mt-4"><ActionButton kind="rollover" /></div>
        </AdminPanel>
        <AdminPanel title="Quêtes du jour">
          <p className="mb-3 text-sm text-muted">{active} quête(s) active(s) dans la réserve. Le serveur en tire quelques-unes chaque jour, identiques pour tous.</p>
          <NumberSetting settingKey="quests.perDay" label="Quêtes par jour" value={perDay} min={1} max={8} />
          <div className="mt-4"><ActionButton kind="catalog" /></div>
        </AdminPanel>
      </div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <AdminPanel title={`Réserve de quêtes · ${quests.length}`}>
          {quests.length === 0 && <p className="text-sm text-muted">Réserve vide : installe le catalogue.</p>}
          <ul className="divide-y divide-line">
            {quests.map((quest) => (
              <li key={quest.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">{quest.title}<span className="ml-2 text-xs text-muted">{quest.target} {metricLabel[quest.metric]} · {quest.rewardXp} XP</span></span>
                <QuestToggle id={quest.id} active={quest.active} />
              </li>
            ))}
          </ul>
        </AdminPanel>
        <AdminPanel title="Nouvelle quête">
          <form action={createQuest} className="grid gap-3">
            <input className={adminInput} name="title" required minLength={3} maxLength={120} placeholder="Titre" />
            <select className={adminInput} name="metric" defaultValue="ANSWERS">{Object.values(QuestMetric).map((metric) => <option key={metric} value={metric}>{metricLabel[metric]}</option>)}</select>
            <div className="grid grid-cols-2 gap-3"><input className={adminInput} name="target" type="number" min={1} required placeholder="Objectif" /><input className={adminInput} name="rewardXp" type="number" min={0} required placeholder="XP" /></div>
            <AdminSubmitButton className={adminButton}>Créer et programmer aujourd’hui</AdminSubmitButton>
          </form>
        </AdminPanel>
      </div>
      <div className="mt-5">
        <AdminPanel title={`Badges · ${badges.length}`}>
          {badges.length === 0 && <p className="text-sm text-muted">Aucun badge : installe le catalogue.</p>}
          <div className="grid gap-5">
            {Object.keys(categoryLabel).map((category) => {
              const list = badges.filter((badge) => badge.category === category);
              if (!list.length) return null;
              return (
                <div key={category}>
                  <h3 className="mb-2 text-sm font-semibold">{categoryLabel[category]}</h3>
                  <div className="grid gap-2">
                    {list.map((badge) => (
                      <div key={badge.id}>
                        <BadgeEditor id={badge.id} name={badge.name} description={badge.description ?? ""} />
                        <p className="mt-1 text-[11px] text-muted">{badge._count.users} étudiant(s) l’ont obtenu.</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </AdminPanel>
      </div>
    </>
  );
}
