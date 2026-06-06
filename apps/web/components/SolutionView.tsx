import React, { useState } from 'react';
import { QuestionData } from '@drut/shared';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Check, X, Zap, BookOpen, Plus, Minus } from 'lucide-react';
import { cn } from '@drut/shared';

/**
 * SolutionView — editorial refresh aligned with the Drut learning framework.
 *
 * Two side-by-side methods rendered as underlined tabs:
 *   - Quick Method  → T.A.R.   (Trigger → Action → Result)
 *   - Full Solution → D.E.E.P. (Diagnose → Extract → Execute → Proof)
 *
 * Framework attribution is shown in faded ink-3 inside each tab — students
 * see the structure as they use it without the tab itself being a buzzword.
 * See docs/learning-framework.md for the full methodology definition.
 */

interface SolutionViewProps {
  question: QuestionData;
}

// Lightweight markdown renderer (token-aware).
// Bold maps to ink-1; inline code to muted bg + monospace; lists to disc.
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--color-ink-1)]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-[var(--color-muted)] rounded-[4px] text-[12px] font-mono text-[var(--color-ink-2)]">$1</code>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');

  return (
    <div
      className="text-[14px] leading-relaxed text-[var(--color-ink-2)] space-y-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// CorrectBanner — the editorial moment that opens every solution.
// Soft lime wash + halftone corner + haloed lime check chip + answer.
const CorrectBanner: React.FC<{ letter: string; text: string }> = ({ letter, text }) => (
  <div className="relative flex items-center gap-4 p-5 mb-6 rounded-[14px] bg-[var(--color-accent)] overflow-hidden">
    {/* Halftone corner ornament for editorial moment */}
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 right-0 h-24 w-32"
      style={{
        backgroundImage:
          'radial-gradient(circle at center, rgba(61, 122, 15, 0.30) 1px, transparent 1.4px)',
        backgroundSize: '6px 6px',
        WebkitMaskImage:
          'radial-gradient(ellipse at top right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 65%)',
        maskImage:
          'radial-gradient(ellipse at top right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 65%)',
      }}
    />
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shrink-0 shadow-[0_0_0_4px_rgba(92,187,33,0.18)]">
      <Check className="w-5 h-5" strokeWidth={3} />
    </span>
    <div className="flex flex-col relative z-10">
      <p className="text-[11px] tracking-[0.08em] uppercase font-bold text-[#3d7a0f]">Correct answer</p>
      <p className="text-[16px] font-bold text-[var(--color-ink-1)] tracking-tight mt-0.5">
        ({letter}) {text}
      </p>
    </div>
  </div>
);

// FrameworkAttribution — faded subhead at the top of each tab.
// Shows the framework expansion (Trigger → Action → Result) plus the
// shorthand (T.A.R.) in a quiet ink-3 line. Educational without being loud.
const FrameworkAttribution: React.FC<{ steps: string; shorthand: string }> = ({
  steps,
  shorthand,
}) => (
  <p className="text-[11px] text-[var(--color-ink-3)] tracking-[0.04em] mb-5 opacity-70">
    <span>{steps}</span>
    <span className="ml-2 font-semibold">— {shorthand}</span>
  </p>
);

export const SolutionView: React.FC<SolutionViewProps> = ({ question }) => {
  const [expandedPhase, setExpandedPhase] = useState<string>('DIAGNOSE');

  const { correctOptionIndex } = question;
  const correctOptionText =
    question.options?.[correctOptionIndex]?.text ||
    `Option ${String.fromCharCode(65 + correctOptionIndex)}`;
  const correctOptionLetter = String.fromCharCode(65 + correctOptionIndex);

  // Fallback chain (canonical → intermediate → oldest legacy):
  //   theOptimalPath is the canonical name on QuestionData today
  //   optimal_path was an intermediate name that was renamed
  //   fastestSafeMethod was the oldest pre-FSM-rename name
  // Same pattern for fullStepByStep (canonical) ← full_solution (intermediate).
  // Cached questions in old shapes still load gracefully via the casts.
  const optimalPath =
    question.theOptimalPath ||
    (question as any).optimal_path ||
    (question as any).fastestSafeMethod;
  const fullSolution = question.fullStepByStep || (question as any).full_solution;

  const isLegacy = !optimalPath && !fullSolution;
  // hasOptimal: canonical type uses `exists`; legacy data used `available`.
  // Check both so any cached shape renders correctly.
  const hasOptimal =
    optimalPath &&
    optimalPath.exists !== false &&
    (optimalPath as any).available !== false &&
    optimalPath.steps?.length > 0;

  // Legacy data with neither structured optimal-path nor structured phases.
  if (isLegacy) {
    return (
      <Card>
        <CardHeader>
          <p className="label-uppercase">Solution</p>
          <CardTitle className="text-[18px] tracking-tight mt-1">Step-by-step</CardTitle>
        </CardHeader>
        <CardContent>
          <CorrectBanner letter={correctOptionLetter} text={correctOptionText} />
          <div className="p-4 rounded-[12px] bg-[var(--color-card)] ring-hairline">
            <MarkdownRenderer
              content={
                (question as any).solution ||
                'Step-by-step solution available below.'
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <p className="label-uppercase">Solution</p>
        <CardTitle className="text-[18px] tracking-tight mt-1">Solutions</CardTitle>
      </CardHeader>
      <CardContent>
        <CorrectBanner letter={correctOptionLetter} text={correctOptionText} />

        <Tabs defaultValue="fsm">
          <TabsList>
            <TabsTrigger value="fsm">
              <Zap className="w-4 h-4" />
              Quick Method
            </TabsTrigger>
            <TabsTrigger value="full">
              <BookOpen className="w-4 h-4" />
              Full Solution
            </TabsTrigger>
          </TabsList>

          {/* Quick Method tab — T.A.R. */}
          <TabsContent value="fsm">
            <FrameworkAttribution
              steps="Trigger → Action → Result"
              shorthand="T.A.R."
            />
            {hasOptimal ? (
              <div className="space-y-2.5">
                {optimalPath.steps.map((step: string, i: number) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-[12px] bg-[var(--color-muted)]"
                  >
                    <div className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-[8px] bg-[var(--color-card)] ring-hairline-strong text-[11px] font-bold num-tabular text-[var(--color-ink-1)] mt-0.5">
                      {i + 1}
                    </div>
                    <div className="text-[14px] flex-1">
                      <MarkdownRenderer content={step} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 rounded-[14px] bg-[var(--color-muted)]">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-card)] ring-hairline mb-3 text-[var(--color-ink-3)]">
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <p className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-1)]">
                  Calculation required
                </p>
                <p className="text-[12px] text-[var(--color-ink-3)] mt-1">
                  No shortcut available. Use the Full Solution method.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Full Solution tab — D.E.E.P. */}
          <TabsContent value="full">
            <FrameworkAttribution
              steps="Diagnose → Extract → Execute → Proof"
              shorthand="D.E.E.P."
            />
            {fullSolution?.phases ? (
              <div className="space-y-2">
                {fullSolution.phases.map((phase: any, idx: number) => {
                  const isExpanded = expandedPhase === phase.label;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-[12px] overflow-hidden transition-all duration-200 relative',
                        isExpanded
                          ? 'bg-[var(--color-muted)] ring-hairline-strong'
                          : 'bg-[var(--color-card)] ring-hairline'
                      )}
                    >
                      {isExpanded && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[var(--color-primary)]"
                        />
                      )}
                      <button
                        onClick={() => setExpandedPhase(isExpanded ? '' : phase.label)}
                        className="w-full flex items-center justify-between p-3 text-left group"
                      >
                        <span
                          className={cn(
                            'label-uppercase',
                            isExpanded
                              ? 'text-[var(--color-ink-1)]'
                              : 'group-hover:text-[var(--color-ink-1)]'
                          )}
                        >
                          {phase.label}
                        </span>
                        <span className="text-[var(--color-ink-3)]">
                          {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0">
                          <div className="border-t border-[var(--color-ink-5)] pt-3">
                            <MarkdownRenderer content={phase.content} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : fullSolution?.steps ? (
              <ul className="space-y-2 list-disc pl-5 text-[14px] text-[var(--color-ink-2)]">
                {fullSolution.steps.map((s: string, i: number) => (
                  <li key={i}>
                    <MarkdownRenderer content={s} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] italic text-[var(--color-ink-3)]">
                Step-by-step solution available below.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
