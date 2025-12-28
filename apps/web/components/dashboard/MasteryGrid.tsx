/**
 * MasteryGrid Component
 * 
 * Grid of topic cards from EXAM_TAXONOMY with progress bars
 * Light theme with subtle colored indicators
 */

import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '@drut/shared';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import type { TopicStats } from '@drut/shared'; // from ../../hooks/useDashboardData';

interface MasteryGridProps {
    topicStats: TopicStats[];
    onTopicClick?: (topicValue: string) => void;
}

export const MasteryGrid: React.FC<MasteryGridProps> = ({
    topicStats,
    onTopicClick,
}) => {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: '#5cbb21' }} />
                <h2 className="text-lg font-semibold text-foreground">Mastery Map</h2>
                <span className="text-sm text-muted-foreground">
                    Your pattern library
                </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {topicStats.map(({ topic, totalPatterns, verifiedPatterns, learningPatterns, progressPercent }) => {
                    const isComplete = progressPercent === 100;

                    return (
                        <Card
                            key={topic.value}
                            onClick={() => onTopicClick?.(topic.value)}
                            className={cn(
                                "cursor-pointer transition-all hover:shadow-md",
                                isComplete && "bg-[#f6fbe8]"
                            )}
                            style={isComplete ? { borderColor: '#5cbb21' } : undefined}
                        >
                            <CardContent className="p-4">
                                {/* Topic header */}
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-medium text-foreground text-sm line-clamp-2 flex-1">
                                        {topic.label}
                                    </h3>
                                    {isComplete && (
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: '#5cbb21' }} />
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-2">
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${progressPercent}%`, backgroundColor: '#5cbb21' }}
                                        />
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium" style={{ color: '#5cbb21' }}>
                                            {verifiedPatterns}/{totalPatterns} Verified
                                        </span>
                                        <span className="text-muted-foreground">
                                            {progressPercent}%
                                        </span>
                                    </div>
                                </div>

                                {/* In-progress indicator */}
                                {!isComplete && learningPatterns > 0 && (
                                    <div className="mt-2 text-xs text-blue-600">
                                        {learningPatterns} in progress
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Empty state */}
            {topicStats.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No topics available</p>
                </div>
            )}
        </div>
    );
};

export default MasteryGrid;
