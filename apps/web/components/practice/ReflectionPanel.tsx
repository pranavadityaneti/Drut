import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface ReflectionPanelProps {
    onReflectionSelect: (reflection: 'guessed' | 'tried' | 'knew' | 'froze') => void;
}

export const ReflectionPanel: React.FC<ReflectionPanelProps> = ({ onReflectionSelect }) => {
    const reflectionOptions = [
        { value: 'guessed' as const, label: '🎲 Guessed', description: 'Made an educated guess' },
        { value: 'tried' as const, label: '🤔 Tried but unsure', description: 'Attempted but uncertain' },
        { value: 'knew' as const, label: '✅ Knew method', description: 'Confident and methodical' },
        { value: 'froze' as const, label: '❄️ Froze', description: 'Got stuck or confused' },
    ];

    return (
        <Card className="border-l-4 border-l-primary animate-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">How did you solve this?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Your honest reflection helps us personalize your learning path
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {reflectionOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onReflectionSelect(option.value)}
                            className="flex flex-col items-start p-4 rounded-lg border-2 border-border hover:border-emerald-500 hover:bg-accent/50 transition-all duration-200 text-left group"
                        >
                            <span className="text-base font-medium mb-1 group-hover:text-emerald-700 transition-colors">
                                {option.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {option.description}
                            </span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
