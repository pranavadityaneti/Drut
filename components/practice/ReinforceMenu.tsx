import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface ReinforceMenuProps {
    onPracticeSimilar: () => void;
    onAddToQueue: () => void;
    onSkip: () => void;
}

export const ReinforceMenu: React.FC<ReinforceMenuProps> = ({
    onPracticeSimilar,
    onAddToQueue,
    onSkip,
}) => {
    return (
        <Card className="animate-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6 space-y-3">
                <h3 className="text-base font-semibold mb-3">Next Step</h3>

                {/* Primary Action */}
                <Button
                    onClick={onPracticeSimilar}
                    className="w-full h-auto py-4 px-6 flex flex-col items-start gap-1 bg-emerald-500 hover:bg-emerald-600"
                >
                    <span className="text-base font-semibold">🎯 Practice 3 Similar</span>
                    <span className="text-xs text-white/80 font-normal">
                        Reinforce this pattern with similar questions
                    </span>
                </Button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={onAddToQueue}
                        variant="outline"
                        className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                    >
                        <span className="text-sm font-medium">📚 Add to Queue</span>
                        <span className="text-xs text-muted-foreground font-normal">
                            Review later
                        </span>
                    </Button>

                    <Button
                        onClick={onSkip}
                        variant="outline"
                        className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                    >
                        <span className="text-sm font-medium">⏭️ Skip</span>
                        <span className="text-xs text-muted-foreground font-normal">
                            Next question
                        </span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
