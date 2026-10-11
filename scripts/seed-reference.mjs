// Données de référence : ligues, limites des offres, quêtes du jour, badges, offres.
// À lancer une fois après la migration (puis relançable sans risque : tout est « upsert »).
//   node scripts/seed-reference.mjs
//
// ⚠ Les PRIX ci-dessous sont des valeurs provisoires (celles de la maquette). À confirmer avant l'ouverture des paiements.

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const TIERS = ['Bit', 'Octet', 'Kilo', 'Méga', 'Giga', 'Téra', 'Péta', 'Exa']

// Offres (proposition révisée, à rediscuter) : Plus = volume de pratique ; Réussite = préparation aux examens. null = illimité.
const LIMITS = [
  { tier: 'FREE',    dailyTrainingSessions: 2,    dailyGames: 1,    examsPerSubject: 1,    spacedReview: false, streakFreezesPerMonth: 0, detailedExamCorrection: false, helpGroup: false },
  { tier: 'PLUS',    dailyTrainingSessions: null, dailyGames: null, examsPerSubject: 3,    spacedReview: true,  streakFreezesPerMonth: 1, detailedExamCorrection: false, helpGroup: false },
  { tier: 'SUCCESS', dailyTrainingSessions: null, dailyGames: null, examsPerSubject: null, spacedReview: true,  streakFreezesPerMonth: 2, detailedExamCorrection: true,  helpGroup: true  },
]

const QUESTS = [
  { slug: 'answer-10', title: 'Réponds à 10 questions', metric: 'ANSWERS',  target: 10, rewardXp: 10 },
  { slug: 'xp-50',     title: 'Gagne 50 XP',            metric: 'XP',       target: 50, rewardXp: 10 },
  { slug: 'chapter-1', title: 'Valide 1 chapitre',      metric: 'CHAPTERS', target: 1,  rewardXp: 20 },
]

// Badges et succès du lancement : [slug, nom, description, catégorie, règle {metric, threshold}]. Les badges propres à un événement se créent avec l'événement.
const BADGES = [
  ['first-read', 'Première lecture', "Lire un cours jusqu'au bout", 'DISCOVERY', { metric: 'chapters_read', threshold: 1 }],
  ['first-quiz', 'Premier quiz', 'Terminer un quiz de chapitre', 'DISCOVERY', { metric: 'quizzes_finished', threshold: 1 }],
  ['first-step', 'Premier pas', 'Valider un premier chapitre', 'DISCOVERY', { metric: 'chapters_validated', threshold: 1 }],
  ['explorer', 'Explorateur', 'Valider un chapitre dans 3 matières différentes', 'DISCOVERY', { metric: 'subjects_started', threshold: 3 }],
  ['first-exam', 'Premier examen', "Terminer un simulateur d'examen", 'DISCOVERY', { metric: 'exams_finished', threshold: 1 }],
  ['first-game', 'Premier jeu', 'Terminer une grille de jeu', 'DISCOVERY', { metric: 'games_finished', threshold: 1 }],
  ['in-league', 'En ligue', 'Entrer en ligue', 'DISCOVERY', { metric: 'league_joined', threshold: 1 }],
  ['streak-3', 'Série de 3 jours', '3 jours de suite', 'REGULARITY', { metric: 'streak_days', threshold: 3 }],
  ['streak-7', 'Série de 7 jours', '7 jours de suite', 'REGULARITY', { metric: 'streak_days', threshold: 7 }],
  ['streak-30', 'Série de 30 jours', '30 jours de suite', 'REGULARITY', { metric: 'streak_days', threshold: 30 }],
  ['streak-100', 'Série de 100 jours', '100 jours de suite', 'REGULARITY', { metric: 'streak_days', threshold: 100 }],
  ['quest-1', 'Quête accomplie', 'Terminer une quête du jour', 'REGULARITY', { metric: 'quests_completed', threshold: 1 }],
  ['quests-day', 'Journée pleine', "Terminer toutes les quêtes d'un même jour", 'REGULARITY', { metric: 'full_quest_days', threshold: 1 }],
  ['quests-week', 'Semaine pleine', 'Terminer toutes les quêtes pendant 7 jours', 'REGULARITY', { metric: 'full_quest_days', threshold: 7 }],
  ['first-try', 'Du premier coup', 'Valider un chapitre dès la première tentative', 'MASTERY', { metric: 'first_try_validations', threshold: 1 }],
  ['chapters-10', '10 chapitres', 'Valider 10 chapitres', 'MASTERY', { metric: 'chapters_validated', threshold: 10 }],
  ['chapters-50', '50 chapitres', 'Valider 50 chapitres', 'MASTERY', { metric: 'chapters_validated', threshold: 50 }],
  ['chapters-100', '100 chapitres', 'Valider 100 chapitres', 'MASTERY', { metric: 'chapters_validated', threshold: 100 }],
  ['answers-100', '100 bonnes réponses', 'Donner 100 bonnes réponses', 'MASTERY', { metric: 'correct_answers', threshold: 100 }],
  ['answers-500', '500 bonnes réponses', 'Donner 500 bonnes réponses', 'MASTERY', { metric: 'correct_answers', threshold: 500 }],
  ['answers-1000', '1 000 bonnes réponses', 'Donner 1 000 bonnes réponses', 'MASTERY', { metric: 'correct_answers', threshold: 1000 }],
  ['subject-done', 'Matière terminée', "Valider tous les chapitres d'une matière", 'MASTERY', { metric: 'subjects_completed', threshold: 1 }],
  ['subjects-10', '10 matières', 'Terminer 10 matières', 'MASTERY', { metric: 'subjects_completed', threshold: 10 }],
  ['subjects-all', 'Parcours complet', 'Terminer toutes les matières du niveau', 'MASTERY', { metric: 'subjects_completed_all', threshold: 1 }],
  ['errors-20', 'Erreurs vaincues', 'Réussir 20 questions auparavant ratées', 'MASTERY', { metric: 'errors_cleared', threshold: 20 }],
  ['review-50', 'Révision solide', 'Réussir 50 révisions espacées', 'MASTERY', { metric: 'reviews_passed', threshold: 50 }],
  ['exam-pass', 'Examen réussi', 'Obtenir au moins la moitié des points à un simulateur', 'MASTERY', { metric: 'exam_pass', threshold: 1 }],
  ['exam-perfect', 'Examen parfait', 'Obtenir 100 % à un simulateur', 'MASTERY', { metric: 'exam_perfect', threshold: 1 }],
  ['six-formats', 'Polyvalent', 'Réussir au moins une question de chacun des 6 formats', 'MASTERY', { metric: 'formats_succeeded', threshold: 6 }],
  ['promoted-1', 'Première montée', "Monter d'un palier de ligue", 'COMPETITION', { metric: 'league_promotions', threshold: 1 }],
  ['podium', 'Sur le podium', "Finir dans les 3 premiers d'un groupe", 'COMPETITION', { metric: 'league_podiums', threshold: 1 }],
  ['champion', 'Champion de la semaine', "Finir premier d'un groupe", 'COMPETITION', { metric: 'league_firsts', threshold: 1 }],
  ['tier-5', 'Palier Giga', 'Atteindre le palier 5 (Giga)', 'COMPETITION', { metric: 'league_tier_reached', threshold: 5 }],
  ['tier-8', 'Palier Exa', 'Atteindre le palier 8 (Exa)', 'COMPETITION', { metric: 'league_tier_reached', threshold: 8 }],
  ['event-1', 'Participant', 'Participer à un événement', 'EVENT', { metric: 'events_joined', threshold: 1 }],
  ['event-team', "Esprit d'équipe", "Contribuer à un défi d'équipe réussi", 'EVENT', { metric: 'team_events_won', threshold: 1 }],
  ['event-solo', 'Défi relevé', "Atteindre l'objectif d'un défi solo", 'EVENT', { metric: 'solo_events_won', threshold: 1 }],
]

// Une ligne par offre et par durée. Prix en FCFA, PROVISOIRES.
const PLANS = [
  { slug: 'plus-mensuel',      name: 'Plus · mensuel',        tier: 'PLUS',    priceXof: 1500,  durationDays: 30 },
  { slug: 'plus-semestre',     name: 'Plus · semestre',       tier: 'PLUS',    priceXof: 7500,  durationDays: 180 },
  { slug: 'reussite-mensuel',  name: 'Réussite · mensuel',    tier: 'SUCCESS', priceXof: 3000,  durationDays: 30 },
  { slug: 'reussite-semestre', name: 'Réussite · semestre',   tier: 'SUCCESS', priceXof: 15000, durationDays: 180 },
]

const SETTINGS = {
  'league.enabled': true,
  'league.unlockAfterChapters': 2,
  'league.groupSize': 10,
  // Pour un groupe de 10 ; montées du palier N = descentes du palier N+1. Proportionnel pour une autre taille.
  'league.tierRules': [
    { position: 1, up: 3, down: 0 }, { position: 2, up: 3, down: 3 }, { position: 3, up: 2, down: 3 }, { position: 4, up: 2, down: 2 },
    { position: 5, up: 2, down: 2 }, { position: 6, up: 1, down: 2 }, { position: 7, up: 1, down: 1 }, { position: 8, up: 0, down: 1 },
  ],
  'league.minPlayersForMoves': null, // seuil sous lequel il n'y a ni montée ni descente : à fixer
  'quiz.validationPercent': 100,
  'quiz.questionsPerFormat': 1,
  'reading.minSeconds': null, // durée minimale de lecture : à fixer (6 s jugées trop courtes)
  'quests.perDay': 3,
  'help.channel': 'in-app',
  'ai.defaultModel': 'claude',
  'ai.monthlyBudgetUsd': 25,
}

for (const [i, name] of TIERS.entries())
  await db.leagueTier.upsert({ where: { position: i + 1 }, update: { name }, create: { position: i + 1, slug: name.toLowerCase().replace('é', 'e'), name } })
for (const l of LIMITS) await db.tierLimits.upsert({ where: { tier: l.tier }, update: l, create: l })
for (const q of QUESTS) await db.questDefinition.upsert({ where: { slug: q.slug }, update: q, create: q })
for (const [i, [slug, name, description, category, rule]] of BADGES.entries())
  await db.badge.upsert({ where: { slug }, update: { name, description, category, rule, position: i }, create: { slug, name, description, category, rule, position: i } })
for (const p of PLANS) await db.plan.upsert({ where: { slug: p.slug }, update: p, create: p })
for (const [key, value] of Object.entries(SETTINGS)) await db.appSetting.upsert({ where: { key }, update: {}, create: { key, value } })

console.log('Données de référence en place.')
await db.$disconnect()
