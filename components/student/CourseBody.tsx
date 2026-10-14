import sanitizeHtml from "sanitize-html";

const courseClasses = [
  "active", "article", "box", "box-lbl", "btn", "btn-start", "cc-box", "cc-title", "ch-body",
  "ch-nav", "ch-nav-btn", "clear-tag", "cmt", "code-block", "code-explain", "code-header",
  "code-lang", "code-lbl", "compare-2", "conn-table", "console-out", "cour", "css-demo",
  "css-demo-label", "demo-frame", "doc", "doc-from", "doc-mock", "down", "ec-exp", "ec-right",
  "ec-tag", "ec-wrong", "em-ann", "em-line", "email-anatomy", "email-block", "email-part",
  "ep-desc", "ep-name", "ep-num", "er-right", "er-wrong", "erreur-row", "ex-card", "ex-grid",
  "expl-arrow", "expl-body", "expl-hi", "expl-n", "expl-row", "expl-snippet", "expl-toggle",
  "expl-txt", "fam", "fc-def", "fc-ex", "fc-name", "fig-card", "fig-grid", "good-list",
  "grid-2", "html", "ic-desc", "ic-ex", "ic-tag", "info", "info-card", "info-grid",
  "jargon-ladder", "jargon-step", "js", "lm-step", "ls-desc", "ls-label", "ls-num", "mnem",
  "never-list", "ok", "php", "pp-rule", "process-arrow", "process-flow", "process-step",
  "ps-desc", "ps-name", "ps-num", "qcm-score", "qcm-wrap", "qcm-wrap-h", "r-label", "r-num",
  "r-step", "rc-ex", "rc-lbl", "rc-meta", "rc-title", "reg-card", "registre-grid", "right",
  "rule-321", "rule-body", "rule-ex", "rule-title", "section", "section-accent", "sound-card",
  "sound-grid", "sout", "ss-desc", "ss-name", "ss-time", "story-box", "story-who",
  "stress-word", "struct-arrow", "struct-flow", "struct-step", "subj-table", "summary", "sw",
  "sym", "t-attr", "t-cmt", "t-const", "t-decl", "t-fn", "t-js-async", "t-js-fn", "t-js-kw",
  "t-js-num", "t-js-str", "t-kw", "t-num", "t-php", "t-str", "t-tag", "t-text", "t-type",
  "t-val", "t-var", "table-err", "table-wrap", "tag-exp", "tag-ff", "tag-gen", "timeline",
  "timeline-item", "tip", "tl-body", "tl-year", "tool-tag", "tool-tags", "up", "vocab-card",
  "vocab-en", "vocab-ex", "vocab-fr", "vocab-grid", "vocab-pill", "vocab-pills", "vocab-tag",
  "warn", "wrong", "xml", "xsl",
];

const allowedTags = [
  "a", "b", "br", "caption", "code", "dd", "div", "dl", "dt", "em", "h2", "h3", "h4",
  "blockquote", "hr", "i", "li", "ol", "p", "pre", "s", "small", "span", "strong",
  "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
];

export default function CourseBody({ html }: { html: string }) {
  const cleanHtml = sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      "*": ["class"],
      a: ["href", "title"],
      ol: ["start"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedClasses: { "*": courseClasses },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
  });

  return <div className="course-content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
