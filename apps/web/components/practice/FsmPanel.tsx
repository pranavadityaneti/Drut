import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { LatexText } from '../ui/LatexText';

interface FsmStep {
    step: string;
    description?: string;
}

interface FsmPanelProps {
    patternTrigger: string;
    steps: FsmStep[];
    safetyChecks: string[];
    whenToUse?: string;
}

export const FsmPanel: React.FC<FsmPanelProps> = ({
    patternTrigger,
    steps,
    safetyChecks,
    whenToUse,
}) => {
    return (
        <Card className="border-l-4 border-l-green-500 animate-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-1">
                        ⚡ Fastest Safe Method
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        The optimal approach for this question type
                    </p>
                </div>

                {/* Pattern Trigger */}
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                        📌 Pattern Trigger
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                        <LatexText text={patternTrigger} />
                    </p>
                </div>

                {/* When to Use */}
                {whenToUse && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">When to use this method:</h4>
                        <p className="text-sm text-muted-foreground">{whenToUse}</p>
                    </div>
                )}

                {/* Steps */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Steps:</h4>
                    <ol className="space-y-3">
                        {steps.map((step, index) => (
                            <li key={index} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center justify-center">
                                    {index + 1}
                                </span>
                                <div className="flex-1 pt-0.5">
                                    <div className="text-sm font-medium text-foreground">
                                        <LatexText text={step.step} />
                                    </div>
                                    {step.description && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            <LatexText text={step.description} />
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Safety Checks */}
                {safetyChecks.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                            ⚠️ Safety Checks (Avoid Traps)
                        </p>
                        <ul className="space-y-1">
                            {safetyChecks.map((check, index) => (
                                <li key={index} className="text-sm text-amber-800 dark:text-amber-200 flex gap-2">
                                    <span className="text-amber-600 dark:text-amber-400">•</span>
                                    <span>
                                        <LatexText text={check} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
