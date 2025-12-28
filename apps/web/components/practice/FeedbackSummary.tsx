import React from 'react';
import { Card, CardContent } from '../ui/Card';

interface FeedbackSummaryProps {
    timeSaved: number; // in seconds, can be negative
    accuracy: number; // percentage
    errorCategory: 'recognition' | 'method' | 'calculation' | 'reading' | null;
    baselineTime: number; // in seconds
}

export const FeedbackSummary: React.FC<FeedbackSummaryProps> = ({
    timeSaved,
    accuracy,
    errorCategory,
    baselineTime,
}) => {
    const isTimeSaved = timeSaved >= 0;

    const categoryLabels = {
        recognition: '🎯 Pattern Recognition',
        method: '🔧 Method Selection',
        calculation: '🔢 Calculation',
        reading: '📖 Question Reading',
    };

    const categoryDescriptions = {
        recognition: 'Struggled to identify the question pattern',
        method: 'Chose a suboptimal or incorrect method',
        calculation: 'Made errors in computation',
        reading: 'Misread or misinterpreted the question',
    };

    return (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-emerald-200 animate-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">📊 Performance Summary</h3>

                <div className="grid grid-cols-2 gap-4">
                    {/* Time Saved */}
                    <div className="bg-card p-4 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Time vs Baseline</p>
                        <p
                            className={`text-2xl font-bold ${isTimeSaved ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                }`}
                        >
                            {isTimeSaved ? '+' : ''}
                            {Math.abs(timeSaved)}s
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Baseline: {baselineTime}s
                        </p>
                    </div>

                    {/* Accuracy */}
                    <div className="bg-card p-4 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                        <p
                            className={`text-2xl font-bold ${accuracy >= 67 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                }`}
                        >
                            {Math.round(accuracy)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {accuracy >= 67 ? 'Great job!' : 'Keep practicing'}
                        </p>
                    </div>
                </div>

                {/* Error Category */}
                {errorCategory && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                            {categoryLabels[errorCategory]}
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                            {categoryDescriptions[errorCategory]}
                        </p>
                    </div>
                )}

                {/* Insight */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-blue-600 dark:text-blue-400 text-lg mt-0.5">💡</span>
                    <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {isTimeSaved && accuracy >= 67
                                ? 'Excellent performance! You\'re mastering this pattern.'
                                : !isTimeSaved && accuracy >= 67
                                    ? 'Good accuracy, but try to solve faster using the FSM.'
                                    : isTimeSaved && accuracy < 67
                                        ? 'You\'re fast, but focus on accuracy first.'
                                        : 'Practice this pattern more to improve both speed and accuracy.'}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
