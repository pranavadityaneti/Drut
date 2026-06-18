import React from 'react';
import { MathText } from './MathText';

/**
 * LatexText — renders inline math AND the small markdown subset by delegating
 * to <MathText>. Kept as a named export so existing call sites (QuestionCard,
 * FsmPanel, sprint, distractor, mini-practice, …) keep working unchanged while
 * sharing ONE web renderer (KaTeX + the shared markdown helper). This is
 * symmetric with mobile's LatexText, which applies the same shared helper — so
 * solutions/steps render identically across web, Android, and iOS. See CLAUDE.md.
 */
interface LatexTextProps {
  text: string;
  className?: string;
}

export const LatexText: React.FC<LatexTextProps> = ({ text, className = '' }) => (
  <MathText text={text} className={className} />
);
