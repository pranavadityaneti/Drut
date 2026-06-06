/**
 * SpeedPulse — editorial refresh.
 *
 * Semi-circle gauge restyled: ink-5 background arc, lime fill arc with
 * dashed-stroke ticks, radial tick marks. Center numeral is display-h1
 * tabular. Rating badge below uses the new neutral-fill + colored-dot
 * pattern. On hover the gauge arc "draws in" via stroke-dashoffset.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { CardMenu } from '../ui/CardMenu';
import { cn } from '@drut/shared';
import { Zap } from 'lucide-react';

interface SpeedPulseProps {
    score: number;
    rating: 'Rookie' | 'Learner' | 'Pro' | 'Elite';
    trend?: number;
    verifiedCount: number;
    totalCount: number;
    className?: string;
    onRefresh?: () => void;
}

const ratingDot: Record<SpeedPulseProps['rating'], string> = {
    Rookie: 'bg-[var(--color-ink-3)]',
    Learner: 'bg-[var(--color-primary)]',
    Pro: 'bg-[var(--color-primary)]',
    Elite: 'bg-[var(--color-accent-warm)]',
};

const trendCopy = (score: number) => {
    if (score < 30) return 'Every pattern mastered is a step forward.';
    if (score < 60) return "You're building momentum.";
    if (score < 85) return 'Approaching mastery.';
    return 'Elite. You set the bar now.';
};

export const SpeedPulse: React.FC<SpeedPulseProps> = ({
    score,
    rating,
    trend = 0,
    verifiedCount,
    totalCount,
    className,
    onRefresh,
}) => {
    // Semi-circle arc length ≈ π * r (r = 80) ≈ 251.2
    const arcLength = 251.2;
    const progressLength = (score / 100) * arcLength;

    return (
        <Card className={cn("group", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[14px] tracking-tight">
                        <Zap className="w-4 h-4 text-[var(--color-primary)]" />
                        Speed pulse
                    </CardTitle>
                    <CardMenu
                        onRefresh={onRefresh}
                        infoTitle="About Speed Pulse"
                        infoContent={
                            <>
                                <p className="mb-2">Speed Pulse measures how well you're mastering patterns quickly and accurately.</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><strong>0–30:</strong> Rookie — just starting</li>
                                    <li><strong>31–60:</strong> Learner — building momentum</li>
                                    <li><strong>61–85:</strong> Pro — strong progress</li>
                                    <li><strong>86–100:</strong> Elite — master level</li>
                                </ul>
                            </>
                        }
                    />
                </div>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col items-center">
                    {/* Semi-circle gauge */}
                    <div className="relative w-56 h-28 mb-3">
                        <svg viewBox="0 0 200 100" className="w-full h-full">
                            {/* Background arc */}
                            <path
                                d="M 20 95 A 80 80 0 0 1 180 95"
                                fill="none"
                                stroke="var(--color-ink-5)"
                                strokeWidth="10"
                                strokeLinecap="round"
                            />

                            {/* Progress arc — draws in on hover */}
                            <path
                                d="M 20 95 A 80 80 0 0 1 180 95"
                                fill="none"
                                stroke="var(--color-primary)"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${progressLength} ${arcLength}`}
                                style={{
                                    strokeDashoffset: progressLength,
                                    transition: 'stroke-dashoffset 800ms ease-out',
                                }}
                                className="group-hover:[stroke-dashoffset:0]"
                            />

                            {/* Radial tick marks at 0, 25, 50, 75, 100 */}
                            {[0, 25, 50, 75, 100].map((tick) => {
                                const angle = Math.PI * (1 - tick / 100);
                                const x1 = 100 + 70 * Math.cos(angle);
                                const y1 = 95 - 70 * Math.sin(angle);
                                const x2 = 100 + 78 * Math.cos(angle);
                                const y2 = 95 - 78 * Math.sin(angle);
                                return (
                                    <line
                                        key={tick}
                                        x1={x1} y1={y1} x2={x2} y2={y2}
                                        stroke="var(--color-ink-4)"
                                        strokeWidth="1"
                                        strokeLinecap="round"
                                    />
                                );
                            })}
                        </svg>

                        {/* Center score */}
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                            <span className="text-[44px] leading-none font-bold tracking-[-0.025em] num-tabular text-[var(--color-ink-1)]">
                                {score}
                            </span>
                        </div>
                    </div>

                    {/* Rating badge — neutral fill, colored dot */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold tracking-tight bg-[var(--color-muted)] text-[var(--color-ink-1)] mb-4">
                        <span className={cn("h-1.5 w-1.5 rounded-full", ratingDot[rating])} aria-hidden />
                        {rating}
                    </span>

                    {/* Stats row */}
                    <div className="flex items-center gap-6 text-[12px]">
                        <div className="text-center">
                            <div className="text-[17px] font-semibold num-tabular text-[var(--color-ink-1)]">{verifiedCount}</div>
                            <div className="label-uppercase mt-0.5">Verified</div>
                        </div>
                        <div className="w-px h-7 bg-[var(--color-ink-5)]" aria-hidden />
                        <div className="text-center">
                            <div className="text-[17px] font-semibold num-tabular text-[var(--color-ink-1)]">{totalCount}</div>
                            <div className="label-uppercase mt-0.5">Seen</div>
                        </div>
                        {trend !== 0 && (
                            <>
                                <div className="w-px h-7 bg-[var(--color-ink-5)]" aria-hidden />
                                <div className="text-center">
                                    <div className={cn(
                                        "text-[17px] font-semibold num-tabular",
                                        trend > 0 ? "text-[#3d7a0f]" : "text-[var(--color-destructive)]"
                                    )}>
                                        {trend > 0 ? '+' : ''}{trend}%
                                    </div>
                                    <div className="label-uppercase mt-0.5">Trend</div>
                                </div>
                            </>
                        )}
                    </div>

                    <p className="mt-3 text-center text-[12px] text-[var(--color-ink-3)] max-w-[28ch] leading-relaxed">
                        {totalCount === 0 ? (
                            <span className="text-[var(--color-primary)] font-medium">Start your speed journey</span>
                        ) : (
                            trendCopy(score)
                        )}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default SpeedPulse;
