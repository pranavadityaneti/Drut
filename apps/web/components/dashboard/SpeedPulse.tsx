/**
 * SpeedPulse Component
 * 
 * Hero component with semi-circle gauge showing Speed Rating (0-100)
 * Modern design with CardMenu and larger numbers
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { CardMenu } from '../ui/CardMenu';
import { cn } from '@drut/shared';
import { Zap, TrendingUp } from 'lucide-react';

interface SpeedPulseProps {
    score: number; // 0-100
    rating: 'Rookie' | 'Learner' | 'Pro' | 'Elite';
    trend?: number; // +/- percentage
    verifiedCount: number;
    totalCount: number;
    className?: string;
    onRefresh?: () => void;
}

export const SpeedPulse: React.FC<SpeedPulseProps> = ({
    score,
    rating,
    trend = 0,
    verifiedCount,
    totalCount,
    className,
    onRefresh,
}) => {
    // Rating colors (Brand-based)
    const ratingConfig: Record<string, { color: string; bg: string; style?: React.CSSProperties }> = {
        Rookie: { color: 'text-muted-foreground', bg: 'bg-muted' },
        Learner: { color: 'text-blue-600', bg: 'bg-blue-100' },
        Pro: { color: '', bg: '', style: { color: '#5cbb21', backgroundColor: '#f6fbe8' } },
        Elite: { color: 'text-amber-600', bg: 'bg-amber-100' },
    };

    const config = ratingConfig[rating];

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Zap className="w-5 h-5" style={{ color: '#5cbb21' }} />
                        Speed Pulse
                    </CardTitle>
                    <CardMenu
                        onRefresh={onRefresh}
                        infoTitle="About Speed Pulse"
                        infoContent={
                            <>
                                <p className="mb-2">Your Speed Score measures how well you're mastering patterns quickly and accurately.</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><strong>0-30:</strong> Rookie - Just getting started</li>
                                    <li><strong>31-60:</strong> Learner - Building momentum</li>
                                    <li><strong>61-85:</strong> Pro - Strong progress</li>
                                    <li><strong>86-100:</strong> Elite - Master level</li>
                                </ul>
                            </>
                        }
                    />
                </div>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col items-center">
                    {/* Semi-circle Gauge */}
                    <div className="relative w-48 h-24 mb-4">
                        <svg viewBox="0 0 200 100" className="w-full h-full">
                            {/* Background arc */}
                            <path
                                d="M 20 95 A 80 80 0 0 1 180 95"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="12"
                                strokeLinecap="round"
                            />

                            {/* Progress arc - Drut Green */}
                            <path
                                d="M 20 95 A 80 80 0 0 1 180 95"
                                fill="none"
                                stroke="#5cbb21"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                                className="transition-all duration-1000"
                            />
                        </svg>

                        {/* Center score */}
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                            <span className="text-5xl font-bold text-foreground">
                                {score}
                            </span>
                        </div>
                    </div>

                    {/* Rating badge */}
                    <span
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium mb-4",
                            config.bg,
                            config.color
                        )}
                        style={config.style}
                    >
                        {rating}
                    </span>

                    {/* Stats row */}
                    <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                            <div className="text-xl font-semibold text-foreground">{verifiedCount}</div>
                            <div className="text-muted-foreground text-xs">Verified</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center">
                            <div className="text-xl font-semibold text-foreground">{totalCount}</div>
                            <div className="text-muted-foreground text-xs">Total Seen</div>
                        </div>
                        {trend !== 0 && (
                            <>
                                <div className="w-px h-8 bg-border" />
                                <div className="flex items-center gap-1">
                                    <TrendingUp className={cn(
                                        "w-4 h-4",
                                        trend > 0 ? "" : "text-red-500"
                                    )} style={trend > 0 ? { color: '#5cbb21' } : undefined} />
                                    <span
                                        className={cn(
                                            "font-medium",
                                            trend > 0 ? "" : "text-red-500"
                                        )}
                                        style={trend > 0 ? { color: '#5cbb21' } : undefined}
                                    >
                                        {trend > 0 ? '+' : ''}{trend}%
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Motivational text */}
                    <p className="mt-3 text-center text-muted-foreground text-xs">
                        {totalCount === 0 ? (
                            <span className="text-primary font-medium">Start Your Speed Journey</span>
                        ) : (
                            <>
                                {score < 30 && "Keep practicing! Every pattern mastered is a step forward."}
                                {score >= 30 && score < 60 && "Great progress! You're building momentum."}
                                {score >= 60 && score < 85 && "Impressive! You're approaching mastery."}
                                {score >= 85 && "Elite status! You're a speed demon!"}
                            </>
                        )}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default SpeedPulse;
