import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowRight, Target, Trophy, Flame, Zap, Award } from 'lucide-react';
import {
    fetchWeakestSubtopics,
    WeakestSubtopic,
    fetchUserStreak,
    fetchSprintPerformance,
    SprintPerformance
} from '@drut/shared'; // from ../../services/analyticsService';
import { log } from '@drut/shared'; // from ../../lib/log';

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
                // Fetch all necessary data points for logic
                const [weakestList, streak, sprints] = await Promise.all([
                    fetchWeakestSubtopics(1),
                    fetchUserStreak(),
                    fetchSprintPerformance()
                ]);

                const weakest = weakestList?.[0] || null;
                const recentSprint = sprints?.[0] || null; // Ascending order? Need to check. get_sprint_performance is DESC usually.

                // Logic to determine Banner Content (Priority-based)
                let selectedContent: BannerContent;

                // 1. Weakness First (Critical to fix)
                if (weakest && weakest.accuracy < 60) {
                    selectedContent = {
                        title: "Turn Weakness into Strength",
                        message: (
                            <span>
                                Your accuracy in <span className="font-bold text-emerald-800">{weakest.subtopic}</span> is only <span className="font-bold text-red-600">{Math.round(weakest.accuracy)}%</span>.
                                Let's fix that right now.
                            </span>
                        ),
                        ctaText: "Fix Weak Areas",
                        ctaAction: () => {
                            localStorage.setItem('selectedSubtopic', weakest.subtopic);
                            window.location.href = '/practice';
                        },
                        icon: Target
                    };
                }
                // 2. High Streak (Motivation)
                else if (streak > 2) {
                    selectedContent = {
                        title: `${streak} Day Streak! 🔥`,
                        message: "You're on fire! Keep the momentum going to build a solid learning habit.",
                        ctaText: "Continue Streak",
                        ctaAction: () => window.location.href = '/practice',
                        icon: Flame
                    };
                }
                // 3. High Performance (Challenge)
                else if (recentSprint && recentSprint.accuracy > 85) {
                    selectedContent = {
                        title: "Crushing It! 🚀",
                        message: `You scored ${Math.round(recentSprint.accuracy)}% in your last sprint. Ready to challenge yourself with something harder?`,
                        ctaText: "Start Hard Sprint",
                        ctaAction: () => window.location.href = '/sprint',
                        icon: Trophy
                    };
                }
                // 4. Default / Generic (Basics)
                else {
                    selectedContent = {
                        title: `Welcome, ${userName.split(' ')[0]}`,
                        message: "Consistency is key. Start your daily practice session to master new patterns.",
                        ctaText: "Start Practicing",
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
            <Card className="border-0 shadow-lg mb-8 h-48 animate-pulse bg-slate-100" />
        );
    }

    const Icon = content.icon;

    return (
        <Card className="border-0 shadow-xl overflow-hidden relative mb-8">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('/dashboard_banner_bg.png')",
                }}
            />

            {/* Overlay for better text readability if needed, but keeping it light for the provided image */}
            <div className="absolute inset-0 z-0 bg-white/30 backdrop-blur-[2px]"></div>

            <CardContent className="p-8 sm:p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <div className="p-2 bg-emerald-100/80 rounded-full text-emerald-800 backdrop-blur-sm">
                            <Icon className="w-5 h-5" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {content.title}
                        </h2>
                    </div>
                    <p className="text-slate-700 text-lg leading-relaxed max-w-2xl font-medium">
                        {content.message}
                    </p>
                </div>

                <div className="flex-shrink-0">
                    <Button
                        className="bg-slate-900 text-white hover:bg-slate-800 border-0 px-8 py-6 text-lg font-semibold shadow-lg transition-transform hover:scale-105"
                        onClick={content.ctaAction}
                    >
                        {content.ctaText}
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </CardContent>

            {/* Decorative Trophy/Effects */}
            <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-10 hidden xl:block pointer-events-none rotate-12 mix-blend-multiply">
                <Trophy className="w-64 h-64 text-emerald-900" />
            </div>
        </Card>
    );
};
