// Mise en forme des cours à l'affichage : même nettoyage que scripts/clean-course-data.mjs (pour le contenu déjà en base),
// et découpage en parties pour la lecture guidée.

const KEEP = new Set(["©", "®", "™"]);

export function stripEmoji(text: string) {
  return text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{20E3}\u{200D}]/gu, (char) => (KEEP.has(char) ? char : ""));
}

export function cleanCourseHtml(html: string) {
  let out = stripEmoji(html);
  out = out.replace(/\sstyle="[^"]*"/g, "");
  out = out.replace(/<(h[2-4])([^>]*)>\s*(?:\d+(?:\.\d+)*\s*[—–\-.):]\s*|\d+(?:\.\d+)+\s+)/g, "<$1$2>");
  out = out.replace(/<p>\s*•([\s\S]*?)<\/p>/g, (_match, inner: string) => {
    const items = inner.split(/<br\s*\/?>/i).map((line) => line.replace(/^\s*•?\s*/, "").trim()).filter(Boolean);
    return items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "";
  });
  out = out.replace(/(<div class="box-lbl">)\s+/g, "$1").replace(/<h([2-4])>\s+/g, "<h$1>");
  return out;
}

export type CoursePart = { title: string | null; html: string };

const textLength = (html: string) => html.replace(/<[^>]+>/g, "").trim().length;

/** Découpe un cours en parties (une par titre de niveau 2). Les parties trop courtes sont regroupées avec la suivante. */
export function splitCourseParts(html: string): CoursePart[] {
  const body = cleanCourseHtml(html).replace(/^\s*<div class="ch-body">/, "").replace(/<\/div>\s*$/, "");
  const pieces = body.split(/(?=<h2[\s>])/i).filter((piece) => piece.trim().length > 0);
  const raw: CoursePart[] = pieces.map((piece) => {
    const match = piece.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/i);
    return { title: match ? match[1].replace(/<[^>]+>/g, "").trim() : null, html: piece };
  });
  const parts: CoursePart[] = [];
  let carry: CoursePart | null = null;
  for (const part of raw) {
    const merged: CoursePart = carry ? { title: carry.title ?? part.title, html: carry.html + part.html } : part;
    if (textLength(merged.html) < 500) {
      carry = merged;
    } else {
      parts.push(merged);
      carry = null;
    }
  }
  if (carry) {
    if (parts.length) parts[parts.length - 1] = { title: parts[parts.length - 1].title, html: parts[parts.length - 1].html + carry.html };
    else parts.push(carry);
  }
  return parts.length ? parts : [{ title: null, html: body }];
}
