import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface PrescriptionChipProps {
    patternName: string;
    onTrainPattern: () => void;
}

export const PrescriptionChip: React.FC<PrescriptionChipProps> = ({
    patternName,
    onTrainPattern,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (isExpanded) {
        return (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
                <Card className="w-80 shadow-2xl border-2 border-emerald-500">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h4 className="text-sm font-semibold text-emerald-600">Personal Prescription</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Recommended training for this pattern
                                </p>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                            <p className="text-sm font-medium mb-1">🎯 Pattern:</p>
                            <p className="text-sm text-muted-foreground">{patternName}</p>
                        </div>

                        <Button onClick={onTrainPattern} className="w-full" size="sm">
                            Train This Pattern →
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsExpanded(true)}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-500 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium text-sm animate-in slide-in-from-bottom-4"
        >
            <span className="text-base">💊</span>
            <span>Train this Pattern →</span>
        </button>
    );
};
