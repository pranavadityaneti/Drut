import React from 'react';
import { QuestionData } from '@drut/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { LatexText } from './ui/LatexText';
import { cn } from '@drut/shared';
import { Clock, Check, X } from 'lucide-react';

/**
 * QuestionCard — editorial refresh.
 *
 * Option states get the muted-fill + colored-dot pattern instead of the
 * previous bright bg-blue-100 / bg-green-100 / bg-red-100 islands:
 *
 * default hairline ring, no fill
 * selected muted fill + ink-1 ring + leading lime dot
 * correct muted fill + green ring + check icon (after submit)
 * wrong muted fill + destructive ring + x icon (after submit)
 *
 * Timer chip uses muted fill + uppercase tracked label + tabular figures.
 * Option letter (A) (B) (C) (D) loses the bright lime green for ink-1.
 */

interface QuestionCardProps {
 data: QuestionData;
 isAnswered: boolean;
 selectedOption: number | null;
 onOptionChange?: (index: number) => void;
 onAnswerSubmit: () => void;
 timeTaken: number;
 targetTime: number;
 isDisabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
 data,
 isAnswered,
 selectedOption,
 onOptionChange,
 onAnswerSubmit,
 timeTaken,
 targetTime,
 isDisabled = false
}) => {

 const getOptionClassName = (index: number) => {
 const base =
 "relative flex items-start gap-3 p-4 rounded-[12px] transition-all cursor-pointer ring-hairline";

 if (isDisabled) {
 return cn(base, "opacity-50 cursor-not-allowed");
 }
 if (!isAnswered) {
 // Pre-answer states
 if (selectedOption === index) {
 // selected — muted fill + leading lime dot
 return cn(base, "bg-[var(--color-muted)] ring-hairline-strong");
 }
 return cn(base, "bg-[var(--color-card)] hover:bg-[var(--color-muted)]");
 }

 // Post-answer states
 const isCorrect = index === data.correctOptionIndex;
 const isSelected = index === selectedOption;

 if (isCorrect) {
 // correct — muted fill, lime stripe on left, check icon
 return cn(
 base,
 "bg-[var(--color-muted)] ring-hairline-strong",
 "before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-r-full before:bg-[var(--color-primary)]"
 );
 }
 if (isSelected && !isCorrect) {
 // wrong — muted fill, destructive stripe on left, x icon
 return cn(
 base,
 "bg-[var(--color-muted)] ring-hairline-strong",
 "before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-r-full before:bg-[var(--color-destructive)]"
 );
 }
 return cn(base, "opacity-50");
 };

 return (
 <Card className="group">
 <CardHeader>
 <div className="flex justify-between items-start flex-wrap gap-3">
 <div className="flex flex-col gap-1">
 <p className="label-uppercase">Question</p>
 <CardTitle className="text-[18px] tracking-tight">Read carefully · pick one</CardTitle>
 <CardDescription className="text-[12px] text-[var(--color-ink-3)]">
 Tap an option to mark it, then submit.
 </CardDescription>
 </div>
 <div className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-1)]">
 <Clock className="w-3.5 h-3.5 text-[var(--color-ink-3)]" />
 <span className="label-uppercase">Time</span>
 <span className="text-[13px] font-semibold num-tabular ml-1">{timeTaken}<span className="text-[var(--color-ink-3)] font-normal">s</span></span>
 </div>
 </div>
 </CardHeader>

 <CardContent>
 <div className="mb-6 text-[15px] leading-relaxed break-words text-[var(--color-ink-1)]">
 <LatexText text={data.questionText} />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {data.options.map((option, index) => {
 const isCorrect = isAnswered && index === data.correctOptionIndex;
 const isSelectedWrong = isAnswered && selectedOption === index && index !== data.correctOptionIndex;
 const isSelectedPre = !isAnswered && selectedOption === index;
 return (
 <label key={index} className={getOptionClassName(index)}>
 <input
 type="radio"
 name="questionOption"
 className="sr-only"
 checked={selectedOption === index}
 onChange={() => !isDisabled && onOptionChange?.(index)}
 disabled={isAnswered || isDisabled}
 />

 {/* Option letter chip */}
 <span className={cn(
 "inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[12px] font-bold shrink-0 num-tabular",
 isSelectedPre || isCorrect || isSelectedWrong
 ? "bg-[var(--color-card)] text-[var(--color-ink-1)] ring-hairline-strong"
 : "bg-[var(--color-muted)] text-[var(--color-ink-2)]"
 )}>
 {String.fromCharCode(65 + index)}
 </span>

 {/* Option text */}
 <span className="break-words text-[14px] text-[var(--color-ink-1)] pt-1 flex-1">
 <LatexText text={option.text} />
 </span>

 {/* Post-answer marker */}
 {isCorrect && (
 <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shrink-0" aria-label="Correct">
 <Check className="w-3.5 h-3.5" strokeWidth={3} />
 </span>
 )}
 {isSelectedWrong && (
 <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-destructive)] text-white shrink-0" aria-label="Wrong">
 <X className="w-3.5 h-3.5" strokeWidth={3} />
 </span>
 )}
 {isSelectedPre && (
 <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] mt-2.5 shrink-0" />
 )}
 </label>
 );
 })}
 </div>

 {!isAnswered && (
 <div className="mt-6 flex justify-end">
 <Button
 onClick={onAnswerSubmit}
 disabled={selectedOption === null || isDisabled}
 variant="ink"
 >
 {isDisabled ? 'Processing…' : 'Submit answer'}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 );
};
