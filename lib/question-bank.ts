import { cleanCourseHtml } from "@/lib/course-format";
import { isValidQuestion, shuffle } from "@/lib/questions";

// Dérivation mécanique de questions à partir du texte d'un cours (aucune IA, aucune invention : tout vient du cours).
// Le résultat est un BROUILLON : il part en relecture, un administrateur le valide avant publication.
//
// Principe : on repère les « notions » du cours = un terme en gras suivi de sa définition
// (« <strong>Terme</strong> : définition », « <strong>Terme</strong> — définition »). Les 5 formats s'en servent.

export type DerivedQuestion = {
  key: string;
  type: "TRUE_FALSE" | "GAP" | "MATCHING" | "DRAG" | "SWIPE";
  text: string;
  data: Record<string, unknown>;
  explanation: string | null;
};

type Notion = { term: string; definition: string };

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "));
  return (stop > 40 ? cut.slice(0, stop) : cut.slice(0, cut.lastIndexOf(" "))).replace(/[,;:\s]+$/, "") + ".";
}

export function extractNotions(bodyHtml: string): Notion[] {
  const html = cleanCourseHtml(bodyHtml);
  const notions: Notion[] = [];
  const seen = new Set<string>();
  const blocks = html.match(/<(li|p)[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  for (const block of blocks) {
    const match = block.match(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*(?:[:：—–-]\s*)([\s\S]+)/i);
    if (!match) continue;
    const term = plain(match[1]).replace(/[:：\s]+$/, "");
    const definition = clip(plain(match[2]).replace(/^[:：—–-]\s*/, ""), 160);
    if (term.length < 2 || term.length > 40 || definition.length < 20) continue;
    if (term.split(/\s+/).length > 5) continue;
    const id = term.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    notions.push({ term, definition });
  }
  return notions;
}

const lowerFirst = (text: string) => (text ? text[0].toLowerCase() + text.slice(1) : text);
const stripFinalDot = (text: string) => text.replace(/[.\s]+$/, "");

function statementTrue(notion: Notion) {
  return `${notion.term} : ${lowerFirst(stripFinalDot(notion.definition))}.`;
}
function statementFalse(notion: Notion, other: Notion) {
  return `${notion.term} : ${lowerFirst(stripFinalDot(other.definition))}.`;
}

/**
 * @param existingTypes types de questions déjà présents dans le chapitre (on ne recrée pas un format déjà couvert)
 * @param keyPrefix préfixe stable des clés (ex. « d-3f2a »), pour que deux dérivations ne se mélangent pas
 */
export function deriveMissingQuestions(
  bodyHtml: string,
  existingTypes: readonly string[],
  keyPrefix: string,
): DerivedQuestion[] {
  const notions = extractNotions(bodyHtml);
  const has = new Set(existingTypes);
  const out: DerivedQuestion[] = [];
  const push = (question: DerivedQuestion) => {
    if (isValidQuestion({ type: question.type, data: question.data as never })) out.push(question);
  };
  if (notions.length < 3) return out;

  if (!has.has("TRUE_FALSE")) {
    shuffle(notions).slice(0, 3).forEach((notion, index) => {
      const others = notions.filter((candidate) => candidate.term !== notion.term);
      const makeFalse = index % 2 === 1 && others.length > 0;
      const statement = makeFalse ? statementFalse(notion, shuffle(others)[0]) : statementTrue(notion);
      push({
        key: `${keyPrefix}-tf${index + 1}`,
        type: "TRUE_FALSE",
        text: statement,
        data: { options: [{ text: "Vrai", correct: !makeFalse }, { text: "Faux", correct: makeFalse }] },
        explanation: `Dans le cours : ${statementTrue(notion)}`,
      });
    });
  }

  if (!has.has("GAP")) {
    shuffle(notions).slice(0, 2).forEach((notion, index) => {
      push({
        key: `${keyPrefix}-gap${index + 1}`,
        type: "GAP",
        text: `Complète : « ____ : ${lowerFirst(stripFinalDot(notion.definition))}. »`,
        data: { answers: [notion.term], hint: `${notion.term.length} caractères` },
        explanation: statementTrue(notion),
      });
    });
  }

  if (!has.has("MATCHING") && notions.length >= 3) {
    const picked = shuffle(notions).slice(0, Math.min(5, notions.length));
    push({
      key: `${keyPrefix}-match1`,
      type: "MATCHING",
      text: "Associe chaque notion à sa définition.",
      data: { pairs: picked.map((notion) => ({ term: notion.term, example: notion.definition })) },
      explanation: null,
    });
  }

  if (!has.has("DRAG") && notions.length >= 4) {
    const picked = shuffle(notions).slice(0, 4);
    const slotNotions = picked.slice(0, 3);
    const distractor = picked[3];
    const bank = shuffle([...slotNotions.map((notion) => notion.term), distractor.term]);
    push({
      key: `${keyPrefix}-drag1`,
      type: "DRAG",
      text: "Glisse chaque terme dans la bonne définition (un terme est en trop).",
      data: {
        slots: slotNotions.map((notion) => notion.definition),
        bank,
        answer: slotNotions.map((notion) => bank.indexOf(notion.term)),
      },
      explanation: null,
    });
  }

  if (!has.has("SWIPE")) {
    const picked = shuffle(notions).slice(0, Math.min(5, notions.length));
    const cards = picked.map((notion, index) => {
      const others = notions.filter((candidate) => candidate.term !== notion.term);
      const makeFalse = index % 2 === 1 && others.length > 0;
      return { text: makeFalse ? statementFalse(notion, shuffle(others)[0]) : statementTrue(notion), answer: !makeFalse };
    });
    push({
      key: `${keyPrefix}-swipe1`,
      type: "SWIPE",
      text: "Vrai ou faux ? Glisse chaque carte.",
      data: { cards, rightLabel: "Vrai", leftLabel: "Faux" },
      explanation: null,
    });
  }

  return out;
}
