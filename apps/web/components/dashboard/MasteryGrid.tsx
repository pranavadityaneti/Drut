/**
 * MasteryGrid — editorial refresh.
 *
 * Section header uses label-uppercase eyebrow + display-h3 title. Grid of
 * topic cards (1/2/4 cols). Each card: label-uppercase eyebrow, topic name,
 * verified/total stat, progress bar with hairline track + lime fill. Complete
 * topics get a coral underline (the "featured" treatment). On hover the
 * progress bar gets a subtle shimmer sweep.
 */

import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '@drut/shared';
import { BookOpen, Check } from 'lucide-react';
import type { TopicStats } from '@drut/shared';

interface MasteryGridProps {
    topicStats: TopicStats[];
    onTopicClick?: (topicValue: string) => void;
}

export const MasteryGrid: React.FC<MasteryGridProps> = ({
    topicStats,
    onTopicClick,
}) => {
    const totalVerified = topicStats.reduce((s, t) => s + t.verifiedPatterns, 0);
    const totalPatterns = topicStats.reduce((s, t) => s + t.totalPatterns, 0);

    return (
        <section className="space-y-4">
            {/* Section header */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <p className="label-uppercase">Mastery map</p>
                    <h2 className="text-[20px] leading-[1.2] font-semibold tracking-tight text-[var(--color-ink-1)] mt-1">
                        Your pattern library
                    </h2>
                </div>
                {totalPatterns > 0 && (
                    <p className="text-[12px] text-[var(--color-ink-3)] num-tabular">
                        <span className="text-[var(--color-ink-1)] font-semibold">{totalVerified}</span>
                        <span className="text-[var(--color-ink-3)]"> / {totalPatterns} verified across {topicStats.length} topics</span>
                    </p>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {topicStats.map(({ topic, totalPatterns, verifiedPatterns, learningPatterns, progressPercent }) => {
                    const isComplete = progressPercent === 100;

                    return (
                        <Card
                            key={topic.value}
                            onClick={() => onTopicClick?.(topic.value)}
                            className={cn(
                                "group relative overflow-hidden cursor-pointer transition-shadow duration-200 card-hover",
                                isComplete && "ring-hairline-strong"
                            )}
                        >
                            {/* Coral underline for completed topics — expands on hover */}
                            {isComplete && (
                                <span
                                    aria-hidden
                                    className="absolute left-4 right-4 bottom-0 h-[2px] rounded-full bg-[var(--color-accent-warm)] origin-center scale-x-[0.5] transition-transform duration-400 ease-out group-hover:scale-x-100"
                                />
                            )}

                            <CardContent className="p-4">
                                {/* Eyebrow row */}
                                <div className="flex items-center justify-between mb-2">
                                    <p className="label-uppercase">Topic</p>
                                    {isComplete && (
                                        <span
                                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                                            aria-label="Mastered"
                                        >
                                            <Check className="w-3 h-3" strokeWidth={2.5} />
                                        </span>
                                    )}
                                </div>

                                {/* Topic name */}
                                <h3 className="font-semibold text-[14px] tracking-tight text-[var(--color-ink-1)] mb-3 line-clamp-2">
                                    {topic.label}
                                </h3>

                                {/* Big stat */}
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-[24px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-ink-1)]">
                                        {verifiedPatterns}
                                    </span>
                                    <span className="text-[12px] text-[var(--color-ink-3)] num-tabular">
                                        / {totalPatterns} verified
                                    </span>
                                </div>

                                {/* Progress bar w/ shimmer sweep on hover */}
                                <div className="relative h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-[var(--color-primary)] rounded-full transition-[width] duration-700 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                    <div
                                        className="absolute inset-y-0 -left-1/3 w-1/3 opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_900ms_ease-out_forwards]"
                                        style={{
                                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)'
                                        }}
                                    />
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center justify-between mt-2.5 text-[11px]">
                                    <span className="num-tabular text-[var(--color-ink-3)] font-medium">
                                        {progressPercent}%
                                    </span>
                                    {learningPatterns > 0 && !isComplete && (
                                        <span className="num-tabular text-[var(--color-accent-warm-foreground)] font-medium">
                                            {learningPatterns} in progress
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Empty state */}
            {topicStats.length === 0 && (
                <div className="text-center py-12">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-ink-3)] mb-3">
                        <BookOpen className="w-5 h-5" />
                    </span>
                    <p className="text-[13px] text-[var(--color-ink-3)]">No topics available yet.</p>
                </div>
            )}
        </section>
    );
};

export default MasteryGrid;
