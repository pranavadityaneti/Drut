import React from 'react';
import { FsmPanel } from './FsmPanel';
import { QuestionData } from '../../types';
import { Card, CardContent } from '../ui/Card';

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
                icon: '❌',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                color: 'text-red-600',
            };
        } else if (!isCorrect) {
            return {
                title: 'Incorrect Answer',
                description: 'Your answer was wrong. Review the solution below.',
                icon: '❌',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                color: 'text-red-600',
            };
        } else {
            return {
                title: 'Too Slow',
                description: `You took ${timeTaken}s but the target is ${targetTime}s.`,
                icon: '⏱️',
                bgColor: 'bg-amber-50',
                borderColor: 'border-amber-200',
                color: 'text-amber-600',
            };
        }
    };

    const failure = getFailureReason();

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
                        <span className="text-emerald-600">💡</span>
                        Fastest Safe Method
                    </h3>

                    {questionData.fastestSafeMethod.exists ? (
                        <FsmPanel
                            patternTrigger={questionData.fastestSafeMethod.preconditions || 'This question type'}
                            steps={questionData.fastestSafeMethod.steps.map((step) => ({ step }))}
                            safetyChecks={
                                questionData.fastestSafeMethod.sanityCheck
                                    ? [questionData.fastestSafeMethod.sanityCheck]
                                    : []
                            }
                            whenToUse="Use this method when you need to solve quickly with high accuracy"
                        />
                    ) : (
                        <div className="p-4 bg-muted rounded-lg text-muted-foreground">
                            No FSM available for this question type.
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
                    className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
                >
                    Prove It 💪
                </button>
            </div>
        </div>
    );
};
