import React from 'react';
import { QuestionData } from '@drut/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { LatexText } from './ui/LatexText';

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

const TimerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 mr-1.5 text-muted-foreground ${className || ''}`}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

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
    let baseClasses = "flex items-center p-4 border rounded-md transition-all cursor-pointer";
    if (isDisabled) {
      return `${baseClasses} bg-muted/30 border-gray-200 opacity-60 cursor-not-allowed`;
    }
    if (!isAnswered) {
      return `${baseClasses} ${selectedOption === index ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 'bg-muted/50 hover:bg-accent'}`;
    }
    // After answering
    const isCorrect = index === data.correctOptionIndex;
    const isSelected = index === selectedOption;

    if (isCorrect) {
      return `${baseClasses} bg-green-100 border-green-400 ring-2 ring-green-300`;
    }
    if (isSelected && !isCorrect) {
      return `${baseClasses} bg-red-100 border-red-400 ring-2 ring-red-300`;
    }
    return `${baseClasses} bg-muted/50 border-transparent`;
  };


  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <CardTitle>Question</CardTitle>
            <CardDescription>Read the problem carefully and select the correct option.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* Target Timer Removed */}
            <div className="bg-secondary text-secondary-foreground text-sm font-medium px-3 py-1.5 rounded-md flex items-center justify-between gap-2 w-[170px] h-[36px] flex-none overflow-hidden">
              <TimerIcon className="shrink-0" />
              <div className="grid grid-cols-[auto_40px_auto] items-center text-xs">
                <span>Your Time:</span>
                <span className="font-mono text-right tabular-nums">{timeTaken}</span>
                <span className="ml-[2px]">s</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-base leading-relaxed break-words">
          <LatexText text={data.questionText} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.options.map((option, index) => (
            <label key={index} className={getOptionClassName(index)}>
              <input
                type="radio"
                name="questionOption"
                className="sr-only"
                checked={selectedOption === index}
                onChange={() => !isDisabled && onOptionChange?.(index)}
                disabled={isAnswered || isDisabled}
              />
              <span className="font-bold mr-4 text-emerald-600">({String.fromCharCode(65 + index)})</span>
              <span className="break-words">
                <LatexText text={option.text} />
              </span>
            </label>
          ))}
        </div>
        {!isAnswered && (
          <div className="mt-6 flex justify-end">
            <Button onClick={onAnswerSubmit} disabled={selectedOption === null || isDisabled} className="transition-none transform-none shadow-none">
              {isDisabled ? 'Processing...' : 'Submit Answer'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};