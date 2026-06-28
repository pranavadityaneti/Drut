import React from 'react';
import { FsmPanel } from './FsmPanel';
import { QuestionData } from '@drut/shared';
import { Card, CardContent } from '../ui/Card';
import { LatexText } from '../ui/LatexText';

interface InterventionModalProps {
 questionData: QuestionData;
 isCorrect: boolean;
 isFast: boolean;
 timeTaken: number;
 targetTime: number;
 onProveIt: () => void;
 onSkip: () => void;
}

export const InterventionModal: React.FC<InterventionModalProps> = ({
 questionData,
 isCorrect,
 isFast,
 timeTaken,
 targetTime,
 onProveIt,
 onSkip,
}) => {
 const getFailureReason = () => {
 if (!isCorrect && !isFast) {
 return {
 title: 'Incorrect & Slow',
 description: `You answered incorrectly and took ${timeTaken}s (target: ${targetTime}s).`,
 icon: '',
 bgColor: 'bg-[#fde7e5]',
 borderColor: 'border-[#fde7e5]',
 color: 'text-[var(--color-destructive)]',
 };
 } else if (!isCorrect) {
 return {
 title: 'Incorrect Answer',
 description: 'Your answer was wrong. Review the solution below.',
 icon: '',
 bgColor: 'bg-[#fde7e5]',
 borderColor: 'border-[#fde7e5]',
 color: 'text-[var(--color-destructive)]',
 };
 } else {
 return {
 title: 'Too Slow',
 description: `You took ${timeTaken}s but the target is ${targetTime}s.`,
 icon: '️',
 bgColor: 'bg-[var(--color-accent-warm-soft)]',
 borderColor: 'border-[var(--color-accent-warm-soft)]',
 color: 'text-[var(--color-accent-warm-foreground)]',
 };
 }
 };

 const failure = getFailureReason();
 const optimalPath = questionData?.theOptimalPath || { exists: false, steps: [], preconditions: '', sanityCheck: '' };
 // New format: clean 3-step Quick Method (no FSM/pattern scaffolding, no labels)
 const quickMethod = questionData?.quickMethod;
 const isNewFormat = !!(quickMethod?.steps?.length);

 return (
 <div className="space-y-4">
 {/* Feedback Header - Inline card */}
 <Card className={`${failure.bgColor} ${failure.borderColor}`}>
 <CardContent className="p-4">
 <div className="flex items-center gap-3">
 <span className="text-2xl">{failure.icon}</span>
 <div>
 <h2 className={`text-lg font-bold ${failure.color}`}>
 {failure.title}
 </h2>
 <p className="text-muted-foreground text-sm">
 {failure.description}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* FSM Solution - Inline card */}
 <Card>
 <CardContent className="p-5">
 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
 <span className="text-[#3d7a0f]"></span>
 {isNewFormat ? 'Quick Method' : 'The Optimal Path'}
 </h3>

 {isNewFormat ? (
 <div className="space-y-2.5">
 {quickMethod?.steps.map((step, i) => (
 <div key={i} className="flex gap-3 p-3 rounded-[12px] bg-[var(--color-muted)]">
 <div className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-[8px] bg-[var(--color-card)] ring-hairline-strong text-[11px] font-bold text-[var(--color-ink-1)] mt-0.5">
 {i + 1}
 </div>
 <div className="text-[14px] flex-1 leading-relaxed">
 <LatexText text={step} />
 </div>
 </div>
 ))}
 </div>
) : optimalPath.exists ? (
 <FsmPanel
 patternTrigger={optimalPath.preconditions || 'This question type'}
 steps={optimalPath.steps.map((step) => ({ step }))}
 safetyChecks={
 optimalPath.sanityCheck
 ? [optimalPath.sanityCheck]
 : []
 }
 whenToUse="Use this method when you need to solve quickly with high accuracy"
 />
) : (
 <div className="p-4 bg-muted rounded-lg text-muted-foreground">
 No optimal path available for this question type.
 </div>
)}
 </CardContent>
 </Card>

 {/* Actions - Right aligned */}
 <div className="flex justify-end gap-3">
 <button
 onClick={onSkip}
 className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
 >
 Skip for now
 </button>

 <button
 onClick={onProveIt}
 className="px-6 py-3 bg-[#3d7a0f] text-white rounded-lg font-semibold hover:bg-[#3d7a0f] transition-colors"
 >
 Prove It
 </button>
 </div>
 </div>
);
};
