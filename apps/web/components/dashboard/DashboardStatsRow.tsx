import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import {
    Activity,
    MoreHorizontal,
    TrendingUp,
    CheckCircle2,
    Clock
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select-new';
import {
    fetchSprintPerformance,
    fetchUserAnalytics,
    fetchSubtopicStats,
    fetchLearningVelocity,
    fetchPatternMasteryStats,
    AnalyticsRow
} from '@drut/shared';
import { EXAM_TAXONOMY, SubtopicDef } from '@drut/shared';

/**
 * DashboardStatsRow — editorial refresh, v2.
 *
 * Four neutral white hairline tiles. The featured slot (Pattern Mastery)
 * is the only color emphasis (coral). Each tile has a subtle hover
 * signature that animates an internal element:
 *
 *   1. Sprint Focus    — wave slides up from the bottom in ink stroke
 *   2. Practice Volume — hatched bars stagger up; coral featured bar pulses
 *   3. Topic Focus     — progress bar gets a sweeping shimmer
 *   4. Pattern Mastery — coral underline expands from center; numeral nudges
 *
 * All transitions are ~250-350ms ease-out. No ambient motion at rest.
 * The hover state is triggered by Tailwind's `group` on the Card and
 * `group-hover:` on internals.
 */

export const DashboardStatsRow = () => {
    const [sprintCount, setSprintCount] = useState(0);

    const [practiceHistory, setPracticeHistory] = useState<{ date: string, count: number }[]>([]);
    const [userStats, setUserStats] = useState<AnalyticsRow | null>(null);

    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
    const [subtopicStats, setSubtopicStats] = useState({ count: 0, accuracy: 0 });
    const [allSubtopics, setAllSubtopics] = useState<SubtopicDef[]>([]);

    const [verifiedPatterns, setVerifiedPatterns] = useState(0);
    const [learningPatterns, setLearningPatterns] = useState(0);

    useEffect(() => {
        const subtopics: SubtopicDef[] = [];
        EXAM_TAXONOMY.forEach(exam => {
            exam.topics.forEach(topic => {
                topic.subtopics.forEach(sub => {
                    subtopics.push(sub);
                });
            });
        });
        setAllSubtopics(subtopics);
        const defaultSub = subtopics.find(s => s.value.includes('basics')) || subtopics[0];
        if (defaultSub) setSelectedSubtopic(defaultSub.value);
    }, []);

    useEffect(() => {
        const loadGlobalStats = async () => {
            try {
                const [sprints, userAn, velocity, mastery] = await Promise.all([
                    fetchSprintPerformance(),
                    fetchUserAnalytics(),
                    fetchLearningVelocity(),
                    fetchPatternMasteryStats()
                ]);

                setSprintCount(sprints?.length || 0);
                setUserStats(userAn);

                const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });

                const historyMap = new Map(velocity?.map(v => [v.day.split('T')[0], v.questions_answered]) || []);
                const chartData = last7Days.map(date => ({
                    date,
                    count: historyMap.get(date) || 0
                }));
                setPracticeHistory(chartData);

                setVerifiedPatterns(mastery.verified_count);
                setLearningPatterns(mastery.learning_count);

            } catch (err) {
                console.error("Failed to load stats", err);
            }
        };
        loadGlobalStats();
    }, []);

    useEffect(() => {
        if (!selectedSubtopic) return;
        const loadSubtopic = async () => {
            try {
                const stats = await fetchSubtopicStats(selectedSubtopic);
                setSubtopicStats({
                    count: Number(stats?.total_attempts || 0),
                    accuracy: Number(stats?.accuracy || 0)
                });
            } catch (err) {
                console.error("Failed to subtopic stats", err);
            }
        };
        loadSubtopic();
    }, [selectedSubtopic]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

            {/* === Card 1: SPRINT FOCUS — neutral; wave hover signature in ink === */}
            <Card className="group bg-card relative overflow-hidden">
                <CardContent className="relative z-10 p-5 flex flex-col justify-between min-h-[190px]">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)] transition-colors duration-300 group-hover:bg-[var(--color-ink-1)] group-hover:text-white">
                            <Clock className="w-4 h-4" />
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-[var(--color-ink-4)]" />
                    </div>

                    <div className="mt-6">
                        <p className="label-uppercase">Total sprints</p>
                        <div className="flex items-end gap-2 mt-1">
                            <h3 className="text-[44px] leading-none font-bold tracking-tight num-tabular text-[var(--color-ink-1)]">
                                {sprintCount}
                            </h3>
                        </div>
                        <p className="text-[11px] text-[var(--color-ink-3)] mt-3 leading-relaxed">
                            Sprints completed so far.
                        </p>
                    </div>
                </CardContent>

                {/* Hover signature: wave slides up from below in ink stroke */}
                <svg
                    aria-hidden
                    viewBox="0 0 400 60"
                    preserveAspectRatio="none"
                    className="absolute bottom-0 left-0 right-0 w-full h-12 pointer-events-none translate-y-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
                >
                    <path
                        d="M0,40 C 80,10 160,55 240,30 C 320,5 360,45 400,25 L 400,60 L 0,60 Z"
                        fill="var(--color-ink-1)"
                        fillOpacity="0.06"
                    />
                    <path
                        d="M0,40 C 80,10 160,55 240,30 C 320,5 360,45 400,25"
                        fill="none"
                        stroke="var(--color-ink-1)"
                        strokeWidth="1.5"
                        strokeOpacity="0.85"
                    />
                </svg>
            </Card>

            {/* === Card 2: PRACTICE VOLUME — neutral + hatched bars, featured coral; bars stagger up on hover === */}
            <Card className="group bg-card relative">
                <CardContent className="p-5 h-full flex flex-col justify-between min-h-[190px]">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] transition-transform duration-300 group-hover:-rotate-6">
                            <Activity className="w-4 h-4" />
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-[var(--color-ink-4)]" />
                    </div>

                    <div className="mt-6">
                        <p className="label-uppercase">Total practice</p>
                        <div className="flex items-end gap-2 mt-1">
                            <h3 className="text-[44px] leading-none font-bold tracking-tight num-tabular text-[var(--color-ink-1)]">
                                {userStats?.total_attempts || 0}
                            </h3>
                        </div>

                        {/* Staggered hatched bars; featured last bar coral and pulses */}
                        <div className="flex items-end justify-between h-12 mt-4 gap-1.5">
                            {(practiceHistory.length > 0 ? practiceHistory : Array(7).fill({ count: 0 })).map((d, i) => {
                                const counts = practiceHistory.map(p => p.count);
                                const max = Math.max(...counts, 10);
                                const h = (d.count / max) * 100;
                                const isFeatured = i === practiceHistory.length - 1 && practiceHistory.length > 0;
                                return (
                                    <div
                                        key={i}
                                        className={
                                            "w-full rounded-[4px] origin-bottom transition-transform duration-300 ease-out " +
                                            (isFeatured
                                                ? "bg-[var(--color-accent-warm)] group-hover:scale-y-[1.10]"
                                                : "bar-hatched group-hover:scale-y-[1.06]")
                                        }
                                        style={{
                                            height: `${Math.max(h, 12)}%`,
                                            transitionDelay: `${i * 60}ms`
                                        }}
                                    />
                                );
                            })}
                        </div>

                        <p className="text-[11px] text-[var(--color-ink-3)] mt-3">
                            Questions answered across all practice.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* === Card 3: TOPIC FOCUS — neutral + progress; shimmer sweep on hover === */}
            <Card className="group bg-card">
                <CardContent className="p-5 h-full flex flex-col justify-between min-h-[190px]">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)] transition-colors duration-300 group-hover:bg-[var(--color-ink-1)] group-hover:text-white">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-[var(--color-ink-4)]" />
                    </div>

                    <div className="mt-4">
                        <Select value={selectedSubtopic} onValueChange={setSelectedSubtopic}>
                            <SelectTrigger className="h-8 text-[12px] w-full bg-[var(--color-muted)] border-0 text-[var(--color-ink-2)] rounded-[8px]">
                                <SelectValue placeholder="Select Topic" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {allSubtopics.map(s => (
                                    <SelectItem key={s.value} value={s.value} className="text-[12px]">
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="mt-3">
                        <p className="label-uppercase">Topic focus</p>
                        <div className="flex items-end gap-2 mt-1">
                            <h3 className="text-[44px] leading-none font-bold tracking-tight num-tabular text-[var(--color-ink-1)]">
                                {Math.round(subtopicStats.accuracy)}%
                            </h3>
                            <span className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-tight num-tabular bg-[var(--color-muted)] text-[#3d7a0f]">
                                +5.0%
                            </span>
                        </div>

                        {/* Progress bar with shimmer-sweep overlay on hover */}
                        <div className="relative w-full h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden mt-3">
                            <div
                                className="absolute inset-y-0 left-0 bg-[var(--color-primary)] rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${Math.max(subtopicStats.accuracy, 5)}%` }}
                            />
                            {/* Shimmer sweep */}
                            <div
                                className="absolute inset-y-0 -left-1/3 w-1/3 opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_900ms_ease-out_forwards]"
                                style={{
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)'
                                }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5 label-uppercase">
                            <span>0%</span>
                            <span>Target 80%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === Card 4: PATTERN MASTERY — FEATURED (coral); underline expands from center === */}
            <Card className="group bg-card relative ring-hairline-strong overflow-hidden">
                {/* Warm wash gradient */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255,233,221,0.55) 100%)' }}
                />
                {/* Coral underline — expands from center on hover */}
                <span
                    aria-hidden
                    className="absolute left-5 right-5 bottom-0 h-[2px] rounded-full bg-[var(--color-accent-warm)] origin-center scale-x-[0.45] transition-transform duration-500 ease-out group-hover:scale-x-100"
                />

                <CardContent className="relative z-10 p-5 h-full flex flex-col justify-between min-h-[190px]">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent-warm-soft)] text-[var(--color-accent-warm-foreground)] transition-transform duration-300 group-hover:scale-110">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-[var(--color-ink-4)]" />
                    </div>

                    <div className="mt-6">
                        <p className="label-uppercase">Pattern mastery</p>
                        <div className="flex items-end gap-2 mt-1">
                            <h3 className="text-[44px] leading-none font-bold tracking-tight num-tabular text-[var(--color-accent-warm)] transition-transform duration-300 group-hover:-translate-y-0.5">
                                {verifiedPatterns}
                            </h3>
                        </div>

                        <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-2 text-[var(--color-ink-3)]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                                    <span className="font-medium">Verified</span>
                                </span>
                                <span className="font-semibold text-[var(--color-ink-1)] num-tabular">{verifiedPatterns}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-2 text-[var(--color-ink-3)]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-warm)]" />
                                    <span className="font-medium">Learning</span>
                                </span>
                                <span className="font-semibold text-[var(--color-ink-1)] num-tabular">{learningPatterns}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
};
