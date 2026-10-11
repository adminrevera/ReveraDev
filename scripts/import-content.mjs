// Charge les 21 fichiers JSON du B1 (dossier data/) dans la base Astyns.
//
//   node scripts/import-content.mjs --dry-run     → ne touche pas à la base, affiche ce qui serait créé
//   node scripts/import-content.mjs               → importe, contenus en « à relire » (IN_REVIEW)
//   node scripts/import-content.mjs --publish     → importe ET publie (pour tester en local seulement)
//
// Relançable sans risque : une version déjà importée n'est jamais écrasée.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DRY = process.argv.includes('--dry-run')
const PUBLISH = process.argv.includes('--publish')
const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')

const SEMESTER = { algo: 1, c_cpp: 1, python: 1, reseaux: 1, stats: 1, fbd: 1, merise: 1, algebre: 1, ato: 1,
  ccna: 2, linux: 2, cybersec: 2, bureautique: 2, droit: 2, git: 2, windows: 2, devweb: 2, devweb2: 2, anglais: 2, vba: 2 }
const TYPE = { mcq: 'MCQ', mcq_multi: 'MCQ_MULTI', true_false: 'TRUE_FALSE', gap: 'GAP', reorder: 'REORDER', matching: 'MATCHING', open: 'OPEN' }

function questionData(q) {
  switch (q.type) {
    case 'gap': return { answers: q.answers, hint: q.hint || null }
    case 'reorder': return { items: q.items }
    case 'matching': return { pairs: q.pairs }
    case 'open': return { modelAnswer: q.model_answer, modelAnswerHtml: q.model_answer_html || null }
    default: return { options: q.options.map(o => ({ text: o.text, correct: !!o.correct, explanation: o.explanation || null })) }
  }
}
function mapQuestions(prefix, list) {
  return list
    .filter(q => q.status !== 'placeholder') // les gabarits ne sont pas importés
    .map((q, i) => ({
      key: `${prefix}:q${i + 1}`,
      position: i,
      type: TYPE[q.type],
      text: q.text || q.label || '',
      data: questionData(q),
      explanation: q.explanation || null,
      level: q.level || null,
      section: q.section || null,
    }))
}

// Transforme un fichier matière en liste de contenus à créer
function plan(S) {
  const items = []
  for (const c of S.chapters) {
    items.push({
      kind: 'CHAPTER', number: c.number, title: c.title,
      visibility: 'PUBLIC', // tous les résumés sont gratuits (ouverts progressivement dans l'app)
      version: { title: c.title, subtitle: c.subtitle || null, bodyHtml: c.body_html, data: { source: c.source } },
      questions: mapQuestions(`${S.slug}:chapter${c.number}`, c.questions), flashcards: [],
    })
  }
  const ex = mapQuestions(`${S.slug}:exercises`, S.exercises)
  if (ex.length) items.push({
    kind: 'EXERCISE_SET', number: 1, title: `Exercices — ${S.name}`, visibility: 'PUBLIC',
    version: { title: `Exercices — ${S.name}`, subtitle: null, bodyHtml: null, data: { source: S.exercises_source } },
    questions: ex, flashcards: [],
  })
  S.simulators.forEach((s, i) => items.push({
    kind: 'SIMULATOR', number: i + 1, title: `Simulateur d'examen — ${S.name}`, visibility: 'PUBLIC',
    version: { title: `Simulateur d'examen — ${S.name}`, subtitle: null, bodyHtml: null, data: { source: s.source, raw: s.variables, normalized: false } },
    questions: [], flashcards: [],
  }))
  if (S.flashcards.length) items.push({
    kind: 'FLASHCARD_DECK', number: 1, title: `Fiches de révision — ${S.name}`, visibility: 'PUBLIC',
    version: { title: `Fiches de révision — ${S.name}`, subtitle: null, bodyHtml: null, data: null },
    questions: [], flashcards: S.flashcards.map((f, i) => ({ position: i, front: f.front, back: f.back, tag: f.tag || null })),
  })
  return items
}

const files = fs.readdirSync(DATA).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort()
const subjects = files.map(f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')))

const totals = { subjects: 0, items: 0, questions: 0, flashcards: 0, skippedPlaceholders: 0 }
for (const S of subjects) {
  const items = plan(S)
  totals.subjects++
  totals.items += items.length
  totals.questions += items.reduce((n, i) => n + i.questions.length, 0)
  totals.flashcards += items.reduce((n, i) => n + i.flashcards.length, 0)
  totals.skippedPlaceholders += S.exercises.filter(q => q.status === 'placeholder').length
  if (DRY) console.log(`${S.slug.padEnd(12)} ${String(items.length).padStart(3)} contenus  ${String(items.reduce((n, i) => n + i.questions.length, 0)).padStart(4)} questions`)
}

if (DRY) {
  console.log('\nSimulation seulement, rien n\'a été écrit.', totals)
  process.exit(0)
}

// ── Écriture dans la base (nécessite : npm i @prisma/client, npx prisma generate, DATABASE_URL) ──
const { PrismaClient } = await import('@prisma/client')
const db = new PrismaClient()
const status = PUBLISH ? 'PUBLISHED' : 'IN_REVIEW'

const inst = await db.institution.upsert({ where: { slug: 'college-de-paris-lome' }, update: {}, create: { slug: 'college-de-paris-lome', name: 'Collège de Paris Lomé' } })
const track = await db.track.upsert({ where: { institutionId_slug: { institutionId: inst.id, slug: 'it' } }, update: {}, create: { institutionId: inst.id, slug: 'it', name: 'IT' } })
const level = await db.level.upsert({ where: { trackId_slug: { trackId: track.id, slug: 'b1' } }, update: {}, create: { trackId: track.id, slug: 'b1', name: 'Bachelor 1', position: 1 } })

const report = { created: 0, alreadyThere: 0 }
let position = 0
for (const S of subjects) {
  const subject = await db.subject.upsert({
    where: { levelId_slug: { levelId: level.id, slug: S.slug } },
    update: {},
    create: { levelId: level.id, slug: S.slug, name: S.name, semester: SEMESTER[S.slug] ?? null, position: position++, visibility: 'PUBLIC' },
  })
  for (const it of plan(S)) {
    const item = await db.contentItem.upsert({
      where: { subjectId_kind_number: { subjectId: subject.id, kind: it.kind, number: it.number } },
      update: {},
      create: { subjectId: subject.id, kind: it.kind, number: it.number, title: it.title, visibility: it.visibility },
    })
    const existing = await db.contentVersion.findUnique({ where: { itemId_version: { itemId: item.id, version: 1 } } })
    if (existing) { report.alreadyThere++; continue }
    await db.$transaction(async tx => {
      const v = await tx.contentVersion.create({
        data: { itemId: item.id, version: 1, status, origin: 'import', note: 'Import du ZIP de l\'ancien site', ...it.version,
          publishedAt: PUBLISH ? new Date() : null,
          questions: { create: it.questions }, flashcards: { create: it.flashcards } },
      })
      if (PUBLISH) await tx.contentItem.update({ where: { id: item.id }, data: { publishedVersionId: v.id } })
    })
    report.created++
  }
  console.log(`✔ ${S.slug}`)
}
console.log('\nTerminé.', report, totals)
await db.$disconnect()
