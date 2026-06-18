import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MATH_DELIMITER_REGEX, applyInlineMarkdown } from '@drut/shared';

/**
 * MathText — renders text that may contain BOTH LaTeX and a small markdown
 * subset (**bold**, *em*, `code`, "- " bullets).
 *
 * Math segments ($...$, $$...$$, \(...\), \[...\]) are rendered with KaTeX;
 * the surrounding text gets inline markdown via the shared helper. This is the
 * web counterpart to mobile's LatexText (both share applyInlineMarkdown), so
 * solutions render identically across web / Android / iOS. See CLAUDE.md.
 *
 * Use for solution / explanation text (which mixes math + markdown). For plain
 * question / option text (math only), the lighter <LatexText> is also fine.
 */
function renderToHtml(text: string): string {
  return text
    .split(MATH_DELIMITER_REGEX)
    .map((part, i) => {
      // Even index = non-math text → inline markdown.
      if (i % 2 === 0) return applyInlineMarkdown(part);
      // Odd index = a LaTeX segment → strip delimiters, render with KaTeX.
      let body = part;
      let displayMode = false;
      if (part.startsWith('$$') && part.endsWith('$$')) {
        body = part.slice(2, -2);
        displayMode = true;
      } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
        body = part.slice(2, -2);
        displayMode = true;
      } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
        body = part.slice(2, -2);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        body = part.slice(1, -1);
      }
      try {
        return katex.renderToString(body, { displayMode, throwOnError: false });
      } catch {
        return part; // fall back to the raw source if KaTeX can't parse it
      }
    })
    .join('');
}

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  if (!text) return null;
  return (
    <span
      className={`math-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderToHtml(text) }}
    />
  );
};
