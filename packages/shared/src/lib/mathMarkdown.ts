// Math-aware inline markdown → HTML.
//
// Shared by web (<MathText>) and mobile (LatexText) so all three clients —
// web, Android, iOS — render question / option / solution text identically and
// never drift. See CLAUDE.md.
//
// LaTeX segments ($...$, $$...$$, \(...\), \[...\]) are left UNTOUCHED so each
// platform's KaTeX pipeline can render them; a small markdown subset (bold,
// italic, inline code, dash-bullets) is applied only to the surrounding text.

/**
 * Matches one LaTeX segment. Declared with a capturing group (and no /g flag)
 * so `String.split` keeps the delimiters: split() returns text at EVEN indices
 * and math segments at ODD indices.
 */
export const MATH_DELIMITER_REGEX =
  /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/;

/**
 * Convert the small inline-markdown subset to HTML. Assumes `s` contains NO
 * LaTeX (callers split math out first via MATH_DELIMITER_REGEX). Emits plain
 * tags (no framework classes) so it is safe in both a DOM and a WebView.
 */
export function applyInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '• $1');
}

/**
 * Apply inline markdown to the non-math parts of `text`, leaving LaTeX segments
 * intact for KaTeX. Returns an HTML string. Used directly by mobile LatexText
 * (KaTeX auto-render then handles the untouched $...$). Web uses
 * MATH_DELIMITER_REGEX + applyInlineMarkdown to render math explicitly.
 */
export function inlineMarkdownToHtml(text: string): string {
  if (!text) return '';
  return text
    .split(MATH_DELIMITER_REGEX)
    .map((part, i) => (i % 2 === 1 ? part : applyInlineMarkdown(part)))
    .join('');
}
