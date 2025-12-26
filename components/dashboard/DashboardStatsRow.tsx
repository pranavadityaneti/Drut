import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import {
    Activity,
    MoreHorizontal,
    TrendingUp,
    CheckCircle2,
    Circle,
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
} from '../../services/analyticsService';
import { EXAM_TAXONOMY, SubtopicDef } from '../../lib/taxonomy';

export const DashboardStatsRow = () => {
    // 1. Sprint Data
    const [sprintCount, setSprintCount] = useState(0);
    const [sprintTrend, setSprintTrend] = useState(0); // Mock trend for now or calc from history

    // 2. Practice Volume (Bar Chart)
    const [practiceHistory, setPracticeHistory] = useState<{ date: string, count: number }[]>([]);
    const [userStats, setUserStats] = useState<AnalyticsRow | null>(null);

    // 3. Focus/Accuracy (Progress)
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
    const [subtopicStats, setSubtopicStats] = useState({ count: 0, accuracy: 0 });
    const [allSubtopics, setAllSubtopics] = useState<SubtopicDef[]>([]);

    // 4. Mastery (List)
    const [verifiedPatterns, setVerifiedPatterns] = useState(0);
    const [learningPatterns, setLearningPatterns] = useState(0);

    useEffect(() => {
        // Init Subtopics
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

                // Process bar chart data (last 7 days)
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

                // Real Pattern Mastery Stats
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            {/* CARD 1: PRIMARY (SPRINT FOCUS) - DARK GREEN */}
            <Card className="border-0 shadow-lg relative overflow-hidden bg-emerald-900 min-h-[180px]">
                {/* Wave Background Graphic */}
                <div className="absolute bottom-0 left-0 right-0 h-24 opacity-40 pointer-events-none">
                    <svg viewBox="0 0 1440 320" className="w-full h-full text-white fill-current">
                        <path fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,208C384,192,480,128,576,133.3C672,139,768,213,864,229.3C960,245,1056,203,1152,186.7C1248,171,1344,181,1392,186.7L1440,192V320H1392C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320H0Z"></path>
                    </svg>
                </div>

                <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between">
                        <div className="p-2 bg-emerald-800/50 rounded-lg backdrop-blur-sm">
                            <Clock className="w-5 h-5 text-emerald-100" />
                        </div>
                        <MoreHorizontal className="w-5 h-5 text-emerald-400/50 cursor-pointer" />
                    </div>

                    <div className="mt-4">
                        <p className="text-emerald-200 text-sm font-medium">Total Sprints</p>
                        <div className="flex items-end gap-3 mt-1">
                            <h3 className="text-4xl font-bold text-white">{sprintCount}</h3>
                            <span className="mb-1 text-xs font-bold bg-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full">
                                +12.5%
                            </span>
                        </div>
                        <p className="text-emerald-400 text-xs mt-3 opacity-90">
                            Sprints completed this week vs last week.
                        </p>
                        {/* Progress bar visual */}
                        <div className="w-24 h-1 bg-emerald-800/50 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-emerald-400 w-[70%] rounded-full"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* CARD 2: PRACTICE VOLUME (BAR CHART) - WHITE */}
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                                <Activity className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Total Practice</span>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-slate-300" />
                    </div>

                    <div className="mt-4">
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-slate-900">
                                {userStats?.total_attempts || 0}
                            </h3>
                            <span className="mb-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                +10.4%
                            </span>
                        </div>

                        {/* Mini Bar Chart */}
                        <div className="flex items-end justify-between h-16 mt-4 gap-1">
                            {(practiceHistory.length > 0 ? practiceHistory : Array(7).fill({ count: 0 })).map((d, i) => {
                                const counts = practiceHistory.map(p => p.count);
                                const max = Math.max(...counts, 10);
                                const h = (d.count / max) * 100;
                                const isEmpty = d.count === 0;
                                return (
                                    <div key={i} className="w-full bg-slate-100 rounded-sm relative group h-full flex items-end">
                                        <div
                                            className={`w-full rounded-sm transition-all duration-500 ${i === 6 ? 'bg-blue-600' : 'bg-blue-400'
                                                } ${isEmpty ? 'opacity-30' : 'opacity-100'}`}
                                            style={{ height: `${Math.max(h, 15)}%` }}
                                        ></div>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs text-slate-400 mt-3 font-medium">
                            Increase in practice by 45 questions this week.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* CARD 3: FOCUS/ACCURACY (PROGRESS) - WHITE */}
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Topic Focus</span>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-slate-300" />
                    </div>

                    {/* Subtopic Dropdown as Header */}
                    <div className="mb-2">
                        <Select value={selectedSubtopic} onValueChange={setSelectedSubtopic}>
                            <SelectTrigger className="h-8 text-xs w-full bg-slate-50 border-0 text-slate-600">
                                <SelectValue placeholder="Select Topic" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {allSubtopics.map(s => (
                                    <SelectItem key={s.value} value={s.value} className="text-xs">
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="mt-2">
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-slate-900">{Math.round(subtopicStats.accuracy)}%</h3>
                            <span className="mb-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                +5%
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1 mb-3">
                            Accuracy for current topic.
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.max(subtopicStats.accuracy, 5)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium uppercase">
                            <span>0%</span>
                            <span>Target: 80%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* CARD 4: MASTERY (LIST VIEW) - WHITE */}
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Pattern Mastery</span>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-slate-300" />
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="flex items-end gap-2 mb-2">
                            <h3 className="text-3xl font-bold text-slate-900">
                                {verifiedPatterns}
                            </h3>
                            <span className="mb-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                +2
                            </span>
                        </div>

                        {/* List Items */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                                    <span className="text-sm font-medium text-slate-600">Verified Patterns</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{verifiedPatterns}</span>
                            </div>
                            <div className="w-full h-[1px] bg-slate-100"></div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></div>
                                    <span className="text-sm font-medium text-slate-600">Learning Phase</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{learningPatterns}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
};
