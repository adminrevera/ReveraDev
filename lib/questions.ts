import type { Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";

// Moteur commun des 6 formats de question : MCQ, TRUE_FALSE, GAP, MATCHING, DRAG, SWIPE.
// Utilisé par le quiz de chapitre, la révision espacée, « Mes erreurs » et l'entraînement libre.
//
// Formes de data (voir aussi prisma/schema.prisma) :
//   MCQ / TRUE_FALSE : { options: [{ text, correct, explanation? }] }
//   GAP              : { answers: string[], hint?: string }
//   MATCHING         : { pairs: [{ term, example }] }
//   DRAG             : { slots: string[], bank: string[], answer: number[] }   (answer[i] = index dans bank pour la case i)
//   SWIPE            : { cards: [{ text, answer: boolean }], rightLabel?: string, leftLabel?: string }

export const QUESTION_FORMATS = ["MCQ", "GAP", "DRAG", "TRUE_FALSE", "MATCHING", "SWIPE"] as const;
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];

export type QuestionRow = { id: string; text: string; type: string; data: Prisma.JsonValue };
export type PresentedQuestion =
  | { id: string; text: string; type: "MCQ" | "TRUE_FALSE"; choices: string[] }
  | { id: string; text: string; type: "GAP"; hint: string | null }
  | { id: string; text: string; type: "MATCHING"; terms: string[]; examples: string[] }
  | { id: string; text: string; type: "DRAG"; slots: string[]; bank: string[] }
  | { id: string; text: string; type: "SWIPE"; cards: string[]; leftLabel: string; rightLabel: string };
export type AnswerValue = number | string | number[];
export type Graded = { isCorrect: boolean; selectedText: string; correctText: string; stored: Prisma.InputJsonValue };

type Option = { text: string; correct: boolean; explanation: string | null };

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function isQuestionFormat(type: string): type is QuestionFormat {
  return (QUESTION_FORMATS as readonly string[]).includes(type);
}

function optionsOf(data: Prisma.JsonValue): Option[] {
  if (!isObject(data) || !Array.isArray(data.options)) return [];
  return data.options.flatMap((entry) => {
    if (!isObject(entry) || typeof entry.text !== "string" || typeof entry.correct !== "boolean") return [];
    return [{ text: entry.text, correct: entry.correct, explanation: typeof entry.explanation === "string" ? entry.explanation : null }];
  });
}

function gapOf(data: Prisma.JsonValue) {
  if (!isObject(data) || !Array.isArray(data.answers)) return null;
  const answers = data.answers.filter((answer): answer is string => typeof answer === "string" && answer.trim().length > 0);
  if (!answers.length || answers.length !== data.answers.length) return null;
  return { hint: typeof data.hint === "string" ? data.hint : null, answers };
}

function pairsOf(data: Prisma.JsonValue) {
  if (!isObject(data) || !Array.isArray(data.pairs)) return [];
  const pairs = data.pairs.flatMap((entry) =>
    isObject(entry) && typeof entry.term === "string" && entry.term.trim() && typeof entry.example === "string" && entry.example.trim()
      ? [{ term: entry.term, example: entry.example }]
      : [],
  );
  return pairs.length === data.pairs.length ? pairs : [];
}

function dragOf(data: Prisma.JsonValue) {
  if (!isObject(data) || !Array.isArray(data.slots) || !Array.isArray(data.bank) || !Array.isArray(data.answer)) return null;
  const slots = data.slots.filter((slot): slot is string => typeof slot === "string" && slot.trim().length > 0);
  const bank = data.bank.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const answer = data.answer.filter((index): index is number => typeof index === "number" && Number.isInteger(index));
  if (slots.length < 1 || slots.length !== data.slots.length || bank.length !== data.bank.length || answer.length !== slots.length) return null;
  if (bank.length < slots.length || bank.length > 12 || new Set(answer).size !== answer.length) return null;
  if (answer.some((index) => index < 0 || index >= bank.length)) return null;
  return { slots, bank, answer };
}

function swipeOf(data: Prisma.JsonValue) {
  if (!isObject(data) || !Array.isArray(data.cards)) return null;
  const cards = data.cards.flatMap((card) =>
    isObject(card) && typeof card.text === "string" && card.text.trim() && typeof card.answer === "boolean"
      ? [{ text: card.text, answer: card.answer }]
      : [],
  );
  if (cards.length < 2 || cards.length > 12 || cards.length !== data.cards.length) return null;
  return {
    cards,
    rightLabel: typeof data.rightLabel === "string" && data.rightLabel ? data.rightLabel : "Vrai",
    leftLabel: typeof data.leftLabel === "string" && data.leftLabel ? data.leftLabel : "Faux",
  };
}

export function isValidQuestion(question: { type: string; data: Prisma.JsonValue }) {
  switch (question.type) {
    case "MCQ":
    case "TRUE_FALSE": {
      const options = optionsOf(question.data);
      return options.length >= 2 && options.filter((option) => option.correct).length === 1;
    }
    case "GAP": return gapOf(question.data) !== null;
    case "MATCHING": return pairsOf(question.data).length >= 2;
    case "DRAG": return dragOf(question.data) !== null;
    case "SWIPE": return swipeOf(question.data) !== null;
    default: return false;
  }
}

export function shuffle<T>(values: T[]) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

/** Nombre d'éléments à mélanger pour une question (0 si l'ordre ne compte pas). */
export function orderSize(question: { type: string; data: Prisma.JsonValue }) {
  switch (question.type) {
    case "MCQ":
    case "TRUE_FALSE": return optionsOf(question.data).length;
    case "MATCHING": return pairsOf(question.data).length;
    case "DRAG": return dragOf(question.data)?.bank.length ?? 0;
    case "SWIPE": return swipeOf(question.data)?.cards.length ?? 0;
    default: return 0;
  }
}

export function randomOrder(question: { type: string; data: Prisma.JsonValue }) {
  return shuffle(Array.from({ length: orderSize(question) }, (_, index) => index));
}

function checkOrder(order: number[], size: number) {
  if (order.length !== size || new Set(order).size !== size || order.some((index) => index < 0 || index >= size)) {
    throw new Error("L’ordre de présentation de cette tentative est invalide.");
  }
}

export function presentQuestion(question: QuestionRow, order: number[]): PresentedQuestion {
  switch (question.type) {
    case "MCQ":
    case "TRUE_FALSE": {
      const options = optionsOf(question.data);
      checkOrder(order, options.length);
      return { id: question.id, text: question.text, type: question.type, choices: order.map((index) => options[index].text) };
    }
    case "GAP": {
      const gap = gapOf(question.data);
      if (!gap) throw new Error("Les données de cette question à trous sont invalides.");
      return { id: question.id, text: question.text, type: "GAP", hint: gap.hint };
    }
    case "MATCHING": {
      const pairs = pairsOf(question.data);
      checkOrder(order, pairs.length);
      return { id: question.id, text: question.text, type: "MATCHING", terms: pairs.map((pair) => pair.term), examples: order.map((index) => pairs[index].example) };
    }
    case "DRAG": {
      const drag = dragOf(question.data);
      if (!drag) throw new Error("Les données de cette question à glisser sont invalides.");
      checkOrder(order, drag.bank.length);
      return { id: question.id, text: question.text, type: "DRAG", slots: drag.slots, bank: order.map((index) => drag.bank[index]) };
    }
    case "SWIPE": {
      const swipe = swipeOf(question.data);
      if (!swipe) throw new Error("Les données de cette question à swiper sont invalides.");
      checkOrder(order, swipe.cards.length);
      return { id: question.id, text: question.text, type: "SWIPE", cards: order.map((index) => swipe.cards[index].text), leftLabel: swipe.leftLabel, rightLabel: swipe.rightLabel };
    }
    default:
      throw new Error("Ce format de question ne peut pas être présenté.");
  }
}

const normalize = (value: string) => value.trim().toLocaleLowerCase("fr-FR");

export function gradeQuestion(question: QuestionRow, order: number[], submitted: AnswerValue): Graded {
  switch (question.type) {
    case "MCQ":
    case "TRUE_FALSE": {
      const options = optionsOf(question.data);
      checkOrder(order, options.length);
      if (typeof submitted !== "number" || submitted >= order.length) throw new Error("Une réponse sélectionnée est invalide.");
      const selected = order[submitted];
      const correct = options.findIndex((option) => option.correct);
      if (correct < 0) throw new Error("La correction de cette question est invalide.");
      return { isCorrect: selected === correct, selectedText: options[selected].text, correctText: options[correct].text, stored: { choiceIndex: submitted, optionIndex: selected } };
    }
    case "GAP": {
      const gap = gapOf(question.data);
      if (!gap || typeof submitted !== "string" || !submitted.trim()) throw new Error("La réponse à cette question à trous est invalide.");
      return {
        isCorrect: gap.answers.some((answer) => normalize(answer) === normalize(submitted)),
        selectedText: submitted.trim(),
        correctText: gap.answers.join(" / "),
        stored: { text: submitted.trim() },
      };
    }
    case "MATCHING": {
      const pairs = pairsOf(question.data);
      checkOrder(order, pairs.length);
      if (!Array.isArray(submitted) || submitted.length !== pairs.length || new Set(submitted).size !== pairs.length || submitted.some((index) => index < 0 || index >= pairs.length)) {
        throw new Error("Les associations envoyées pour cette question sont invalides.");
      }
      const expected = pairs.map((_, pairIndex) => order.indexOf(pairIndex));
      return {
        isCorrect: submitted.every((exampleIndex, termIndex) => exampleIndex === expected[termIndex]),
        selectedText: pairs.map((pair, termIndex) => `${pair.term} → ${pairs[order[submitted[termIndex]]].example}`).join(" · "),
        correctText: pairs.map((pair) => `${pair.term} → ${pair.example}`).join(" · "),
        stored: { exampleIndexes: submitted.map((index) => order[index]) },
      };
    }
    case "DRAG": {
      const drag = dragOf(question.data);
      if (!drag) throw new Error("Les données de cette question à glisser sont invalides.");
      checkOrder(order, drag.bank.length);
      if (!Array.isArray(submitted) || submitted.length !== drag.slots.length || new Set(submitted).size !== submitted.length || submitted.some((index) => index < 0 || index >= drag.bank.length)) {
        throw new Error("Les éléments glissés sont invalides.");
      }
      const original = submitted.map((index) => order[index]);
      return {
        isCorrect: original.every((bankIndex, slotIndex) => bankIndex === drag.answer[slotIndex]),
        selectedText: drag.slots.map((slot, slotIndex) => `${slot} → ${drag.bank[original[slotIndex]]}`).join(" · "),
        correctText: drag.slots.map((slot, slotIndex) => `${slot} → ${drag.bank[drag.answer[slotIndex]]}`).join(" · "),
        stored: { bankIndexes: original },
      };
    }
    case "SWIPE": {
      const swipe = swipeOf(question.data);
      if (!swipe) throw new Error("Les données de cette question à swiper sont invalides.");
      checkOrder(order, swipe.cards.length);
      if (!Array.isArray(submitted) || submitted.length !== swipe.cards.length || submitted.some((value) => value !== 0 && value !== 1)) {
        throw new Error("Les choix envoyés sont invalides.");
      }
      const label = (right: boolean) => (right ? swipe.rightLabel : swipe.leftLabel);
      const cards = order.map((index) => swipe.cards[index]);
      return {
        isCorrect: cards.every((card, position) => (submitted[position] === 1) === card.answer),
        selectedText: cards.map((card, position) => `${card.text} → ${label(submitted[position] === 1)}`).join(" · "),
        correctText: cards.map((card) => `${card.text} → ${label(card.answer)}`).join(" · "),
        stored: { rights: submitted.map((value) => value === 1) },
      };
    }
    default:
      throw new Error("Ce format de question ne peut pas être corrigé.");
  }
}

export function explanationFromOptions(question: { type: string; data: Prisma.JsonValue }) {
  if (question.type !== "MCQ" && question.type !== "TRUE_FALSE") return null;
  return optionsOf(question.data).find((option) => option.correct)?.explanation ?? null;
}
