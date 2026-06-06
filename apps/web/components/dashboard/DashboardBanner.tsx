/**
 * DashboardBanner — editorial refresh.
 *
 * Editorial banner card: neutral hairline, halftone corner ornament, single
 * icon chip + h2 title + supporting paragraph, ink CTA on the right. Drops
 * the background image, backdrop blur, rotated trophy SVG, and all emoji
 * from generated titles.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowRight, Target, Trophy, Flame, Zap } from 'lucide-react';
import {
    fetchWeakestSubtopics,
    fetchUserStreak,
    fetchSprintPerformance,
} from '@drut/shared';
import { log } from '@drut/shared';

interface DashboardBannerProps {
    userName: string;
}

type BannerContent = {
    title: string;
    message: React.ReactNode;
    ctaText: string;
    ctaAction: () => void;
    icon: React.ElementType;
};

export const DashboardBanner: React.FC<DashboardBannerProps> = ({ userName }) => {
    const [content, setContent] = useState<BannerContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [weakestList, streak, sprints] = await Promise.all([
                    fetchWeakestSubtopics(1),
                    fetchUserStreak(),
                    fetchSprintPerformance()
                ]);

                const weakest = weakestList?.[0] || null;
                const recentSprint = sprints?.[0] || null;

                let selectedContent: BannerContent;

                if (weakest && weakest.accuracy < 60) {
                    selectedContent = {
                        title: "Turn weakness into strength",
                        message: (
                            <span>
                                Your accuracy in{' '}
                                <span className="font-semibold text-[var(--color-ink-1)]">
                                    {weakest.subtopic}
                                </span>{' '}
                                is{' '}
                                <span className="font-semibold text-[var(--color-destructive)]">
                                    {Math.round(weakest.accuracy)}%
                                </span>
                                . Let's close that gap.
                            </span>
                        ),
                        ctaText: "Fix weak areas",
                        ctaAction: () => {
                            localStorage.setItem('selectedSubtopic', weakest.subtopic);
                            window.location.href = '/practice';
                        },
                        icon: Target
                    };
                }
                else if (streak > 2) {
                    selectedContent = {
                        title: `${streak} day streak`,
                        message: "You're on a roll. Keep the daily session going to lock in the habit.",
                        ctaText: "Continue streak",
                        ctaAction: () => window.location.href = '/practice',
                        icon: Flame
                    };
                }
                else if (recentSprint && recentSprint.accuracy > 85) {
                    selectedContent = {
                        title: "On a tear",
                        message: `You scored ${Math.round(recentSprint.accuracy)}% in your last sprint. Ready to push the difficulty?`,
                        ctaText: "Start hard sprint",
                        ctaAction: () => window.location.href = '/sprint',
                        icon: Trophy
                    };
                }
                else {
                    selectedContent = {
                        title: `Welcome, ${userName.split(' ')[0]}`,
                        message: "Consistency does the heavy lifting. Start a session and start chipping away.",
                        ctaText: "Start practicing",
                        ctaAction: () => window.location.href = '/practice',
                        icon: Zap
                    };
                }

                setContent(selectedContent);

            } catch (e) {
                log.error('Failed to load dashboard banner data', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userName]);

    if (loading || !content) {
        return (
            <Card className="mb-8 h-32 animate-pulse" />
        );
    }

    const Icon = content.icon;

    return (
        <Card className="group relative overflow-hidden mb-8">
            {/* Halftone corner ornament (top-right) */}
            <div
                aria-hidden
                className="pointer-events-none absolute top-0 right-0 h-40 w-60 transition-transform duration-700 ease-out group-hover:translate-x-2 group-hover:-translate-y-1"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(11, 11, 13, 0.22) 1px, transparent 1.4px)',
                    backgroundSize: '6px 6px',
                    WebkitMaskImage: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 65%)',
                    maskImage: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 65%)',
                }}
            />

            <CardContent className="relative z-10 p-7 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
                            <Icon className="w-4 h-4" />
                        </span>
                        <p className="label-uppercase">Focus for today</p>
                    </div>
                    <h2 className="text-[26px] md:text-[28px] leading-[1.15] font-bold tracking-[-0.015em] text-[var(--color-ink-1)]">
                        {content.title}
                    </h2>
                    <p className="text-[14px] text-[var(--color-ink-3)] mt-2 max-w-[64ch] leading-relaxed">
                        {content.message}
                    </p>
                </div>

                <div className="shrink-0">
                    <Button
                        onClick={content.ctaAction}
                        variant="ink"
                        size="lg"
                        className="h-11 px-5 text-[14px]"
                    >
                        {content.ctaText}
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
