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
 * DashboardStatsRow — editorial refresh.
 *
 * 4-up KPI grid. Visual hierarchy:
 *   1. Sprint Focus    — INK tile (dark, halftone corner ornament)
 *   2. Practice Volume — neutral hairline card + hatched mini-bar chart, featured bar coral
 *   3. Topic Focus     — neutral hairline card + progress bar
 *   4. Pattern Mastery — FEATURED tile (warm wash bg, coral number, coral underline)
 *
 * Each tile follows the same vertical rhythm:
 *   icon chip → uppercase tracked label → enormous tabular numeral → tiny trend pill → footnote.
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

            {/* === Card 1: SPRINT FOCUS — INK tile === */}
            <Card className="relative overflow-hidden min-h-[180px] bg-[var(--color-ink-1)] text-white ring-hairline-strong">
                {/* Halftone corner ornament (replaces the wave SVG) */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 right-0 h-32 w-32 opacity-60"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.32) 1px, transparent 1.4px)',
                        backgroundSize: '6px 6px',
                        WebkitMaskImage: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)',
                        maskImage: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)',
                    }}
                />

                <CardContent className="relative z-10 p-5 flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/10 text-white">
                            <Clock className="w-4 h-4" />
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-white/40 cursor-pointer" />
                    </div>

                    <div className="mt-6">
                        <p className="label-uppercase text-white/60">Total sprints</p>
                        <div className="flex items-end gap-2 mt-1">
                            <h3 className="text-[44px] leading-none font-bold tracking-tight num-tabular text-white">
                                {sprintCount}
                            </h3>
                            <span className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-tight num-tabular bg-white/10 text-white">
                                +12.5%
                            </span>
                        </div>
                        <p className="text-white/55 text-[11px] mt-3 leading-relaxed">
                            Sprints completed this week vs last.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* === Card 2: PRACTICE VOLUME — neutral + hatched bars, featured coral === */}
            <Card className="bg-card relative">
                <CardContent className="p-5 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
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
                            <span className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-tight num-tabular bg-[var(--color-muted)] text-[#3d7a0f]">
                                +10.4%
                            </span>
                        </div>

                        {/* Hatched mini bar chart with coral featured last bar */}
                        <div className="flex items-end justify-between h-12 mt-4 gap-1.5">
                            {(practiceHistory.length > 0 ? practiceHistory : Array(7).fill({ count: 0 })).map((d, i) => {
                                const counts = practiceHistory.map(p => p.count);
                                const max = Math.max(...counts, 10);
                                const h = (d.count / max) * 100;
                                const isFeatured = i === practiceHistory.length - 1;
                                return (
                                    <div
                                        key={i}
                                        className={
                                            "w-full rounded-[4px] " +
                                            (isFeatured ? "bg-[var(--color-accent-warm)]" : "bar-hatched")
                                        }
                                        style={{ height: `${Math.max(h, 12)}%` }}
                                    />
                                );
                            })}
                        </div>

                        <p className="text-[11px] text-[var(--color-ink-3)] mt-3">
                            +45 questions this week.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* === Card 3: TOPIC FOCUS — neutral + progress === */}
            <Card className="bg-card">
                <CardContent className="p-5 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)]">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-[var(--color-ink-4)]" />
                    </div>

                    {/* Subtopic dropdown */}
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

                        {/* Progress bar — muted track, lime fill */}
                        <div className="w-full h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden mt-3">
                            <div
                                className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-1000"
                                style={{ width: `${Math.max(subtopicStats.accuracy, 5)}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5 label-uppercase">
                            <span>0%</span>
                            <span>Target 80%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === Card 4: PATTERN MASTERY — FEATURED tile (coral) === */}
            <Card className="bg-card relative ring-hairline-strong overflow-hidden">
                {/* Warm wash gradient */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255,233,221,0.55) 100%)' }}
                />
                {/* Coral underline accent */}
                <span
                    aria-hidden
                    className="absolute left-5 right-5 bottom-0 h-[2px] rounded-full bg-[var(--color-accent-warm)]"
                />

                <CardContent className="relative z-10 p-5 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent-warm-soft)] text-[var(--color-accent-warm-foreground)]">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-[var(--color-ink-4)]" />
                    </div>

                    <div className="mt-6">
                        <p className="label-uppercase">Pattern mastery</p>
                        <div className="flex items-end gap-2 mt-1">
                            <h3 className="text-[44px] leading-none font-bold tracking-tight num-tabular text-[var(--color-accent-warm)]">
                                {verifiedPatterns}
                            </h3>
                            <span className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-tight num-tabular bg-[var(--color-muted)] text-[#3d7a0f]">
                                +2
                            </span>
                        </div>

                        {/* Verified vs learning split */}
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
