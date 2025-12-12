/**
 * MasteryGrid Component
 * 
 * Grid of topic cards from EXAM_TAXONOMY with progress bars
 * Light theme with subtle colored indicators
 */

import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '@/lib/utils';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import type { TopicStats } from '../../hooks/useDashboardData';

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
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-foreground">Mastery Map</h2>
                <span className="text-sm text-muted-foreground">
                    Your pattern library
                </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {topicStats.map(({ topic, totalPatterns, verifiedPatterns, learningPatterns, progressPercent }) => {
                    const isComplete = progressPercent === 100;

                    return (
                        <Card
                            key={topic.value}
                            onClick={() => onTopicClick?.(topic.value)}
                            className={cn(
                                "cursor-pointer transition-all hover:shadow-md hover:border-emerald-200",
                                isComplete && "border-emerald-300 bg-emerald-50/50"
                            )}
                        >
                            <CardContent className="p-4">
                                {/* Topic header */}
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-medium text-foreground text-sm line-clamp-2 flex-1">
                                        {topic.label}
                                    </h3>
                                    {isComplete && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-2">
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-emerald-600 font-medium">
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
