import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface MiniQuestion {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
}

interface MiniPracticeProps {
    questions: MiniQuestion[];
    onComplete: (results: { correct: number; total: number; timeTaken: number }) => void;
}

export const MiniPractice: React.FC<MiniPracticeProps> = ({ questions, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [results, setResults] = useState<boolean[]>([]);
    const [startTime] = useState(Date.now());

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    const handleSubmit = () => {
        if (selectedOption === null) return;

        const isCorrect = selectedOption === currentQuestion.correctIndex;
        const newResults = [...results, isCorrect];
        setResults(newResults);

        if (isLastQuestion) {
            // Complete the mini practice
            const timeTaken = Math.round((Date.now() - startTime) / 1000);
            const correct = newResults.filter((r) => r).length;
            onComplete({ correct, total: questions.length, timeTaken });
        } else {
            // Move to next question
            setCurrentIndex(currentIndex + 1);
            setSelectedOption(null);
        }
    };

    return (
        <Card className="border-2 border-dashed border-emerald-300 animate-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">🔄 Mini Practice</h3>
                    <span className="text-sm text-muted-foreground font-medium">
                        {currentIndex + 1} / {questions.length}
                    </span>
                </div>

                {/* Progress dots */}
                <div className="flex gap-2 justify-center">
                    {questions.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                                    ? 'w-8 bg-emerald-500'
                                    : idx < currentIndex
                                        ? 'w-2 bg-green-500'
                                        : 'w-2 bg-muted'
                                }`}
                        />
                    ))}
                </div>

                {/* Question */}
                <div className="space-y-4">
                    <p className="text-base font-medium leading-relaxed">{currentQuestion.text}</p>

                    {/* Options */}
                    <div className="space-y-2">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedOption(index)}
                                className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${selectedOption === index
                                        ? 'border-emerald-500 bg-emerald-50 font-medium'
                                        : 'border-border hover:border-emerald-500/50 hover:bg-accent/50'
                                    }`}
                            >
                                <span className="text-sm font-medium mr-3 text-muted-foreground">
                                    {String.fromCharCode(65 + index)}.
                                </span>
                                <span className="text-sm">{option}</span>
                            </button>
                        ))}
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={selectedOption === null}
                        className="w-full"
                    >
                        {isLastQuestion ? 'Complete Practice' : 'Next'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
