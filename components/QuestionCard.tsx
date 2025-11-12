import React from 'react';
import { QuestionData } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';

interface QuestionCardProps {
  data: QuestionData;
  isAnswered: boolean;
  selectedOption: number | null;
  onOptionChange: (index: number) => void;
  onAnswerSubmit: () => void;
  timeTaken: number;
  targetTime: number;
}

const TimerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1.5 text-muted-foreground"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  data, 
  isAnswered,
  selectedOption,
  onOptionChange,
  onAnswerSubmit,
  timeTaken,
  targetTime
}) => {

  const getOptionClassName = (index: number) => {
    let baseClasses = "flex items-center p-4 border rounded-md transition-all cursor-pointer";
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
                <CardTitle>Question</CardTitle>
                <CardDescription>Read the problem carefully and select the correct option.</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
                <div className="flex items-center bg-secondary text-secondary-foreground text-sm font-medium px-3 py-1.5 rounded-md">
                    <TimerIcon />
                    <span>Target: {targetTime}s</span>
                </div>
                <div className="flex items-center bg-secondary text-secondary-foreground text-sm font-medium px-3 py-1.5 rounded-md">
                    <TimerIcon />
                    <span>Your Time: {timeTaken}s</span>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-6 text-base leading-relaxed">{data.questionText}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.options.map((option, index) => (
            <label key={index} className={getOptionClassName(index)}>
              <input
                type="radio"
                name="questionOption"
                className="sr-only"
                checked={selectedOption === index}
                onChange={() => onOptionChange(index)}
                disabled={isAnswered}
              />
              <span className="font-bold mr-4 text-primary">({String.fromCharCode(65 + index)})</span>
              <span>{option.text}</span>
            </label>
          ))}
        </div>
        {!isAnswered && (
            <div className="mt-6 flex justify-end">
                <Button onClick={onAnswerSubmit} disabled={selectedOption === null}>
                    Submit Answer
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};
