// Nettoie le HTML des cours dans data/*.json : plus d'emojis, plus de numérotation « 3.1 — », objectifs en vraie liste,
// plus de styles en ligne. Les cours ont ainsi une mise en page à nous, sans trace de l'ancien site.
//   node scripts/clean-course-data.mjs            → réécrit data/*.json
//   node scripts/clean-course-data.mjs --dry-run  → compte seulement
// La même logique existe à l'affichage (lib/course-format.ts) pour le contenu déjà importé en base.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DRY = process.argv.includes('--dry-run')
const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const KEEP = new Set(['©', '®', '™'])

export function stripEmoji(text) {
  return text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{20E3}\u{200D}]/gu, (ch) => (KEEP.has(ch) ? ch : ''))
}

export function cleanCourseHtml(html) {
  let out = stripEmoji(html)
  out = out.replace(/\sstyle="[^"]*"/g, '')
  // numérotation des titres : « 2.1 — », « 3) », « 4. »
  out = out.replace(/<(h[2-4])([^>]*)>\s*(?:\d+(?:\.\d+)*\s*[—–\-.):]\s*|\d+(?:\.\d+)+\s+)/g, '<$1$2>')
  // « Partie 1 : » reste lisible, mais « Étape 3.2 — » perd son numéro composé
  // objectifs en puces « • » → liste
  out = out.replace(/<p>\s*•([\s\S]*?)<\/p>/g, (_, inner) => {
    const items = inner.split(/<br\s*\/?>/i).map((s) => s.replace(/^\s*•?\s*/, '').trim()).filter(Boolean)
    return items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : ''
  })
  out = out.replace(/(<div class="box-lbl">)\s+/g, '$1').replace(/\s+(<\/div>)/g, '$1')
  out = out.replace(/<h([2-4])>\s+/g, '<h$1>')
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let changed = 0
  for (const file of fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
    const full = path.join(DATA, file)
    const subject = JSON.parse(fs.readFileSync(full, 'utf8'))
    for (const chapter of subject.chapters ?? []) {
      const before = chapter.body_html
      chapter.body_html = cleanCourseHtml(before)
      chapter.title = stripEmoji(chapter.title ?? '').trim()
      if (chapter.subtitle) chapter.subtitle = stripEmoji(chapter.subtitle).trim()
      if (before !== chapter.body_html) changed++
    }
    if (!DRY) fs.writeFileSync(full, JSON.stringify(subject, null, 2) + '\n')
  }
  console.log(`${changed} chapitres nettoyés${DRY ? ' (simulation)' : ''}.`)
}
