import React from 'react';
import { FsmPanel } from './FsmPanel';
import { QuestionData } from '../../types';

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
                color: 'text-red-500',
            };
        } else if (!isCorrect) {
            return {
                title: 'Incorrect Answer',
                description: 'Your answer was wrong. Review the solution below.',
                icon: '❌',
                color: 'text-red-500',
            };
        } else {
            return {
                title: 'Too Slow',
                description: `You took ${timeTaken}s but the target is ${targetTime}s.`,
                icon: '⏱️',
                color: 'text-amber-500',
            };
        }
    };

    const failure = getFailureReason();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">{failure.icon}</span>
                        <div>
                            <h2 className={`text-2xl font-bold ${failure.color}`}>
                                {failure.title}
                            </h2>
                            <p className="text-muted-foreground mt-1">
                                {failure.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* FSM Solution */}
                <div className="p-6">
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
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onProveIt}
                        className="flex-1 px-6 py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    >
                        Prove It 💪
                        <span className="block text-sm font-normal opacity-80">
                            Try a similar question now
                        </span>
                    </button>

                    <button
                        onClick={onSkip}
                        className="px-6 py-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                        Skip for now
                        <span className="block text-xs opacity-60">
                            (marks as debt)
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
