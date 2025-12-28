import React, { useState, useEffect } from 'react';
import { fetchSprintPerformance } from '@drut/shared'; // from ../../services/analyticsService';
import { getTopicOptions, getSubtopicOptions } from '@drut/shared'; // from ../../lib/taxonomy';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Zap, Trophy, Timer, Flame, CheckCircle2 } from 'lucide-react';
import { EXAM_SPECIFIC_TOPICS } from '@drut/shared';

interface SprintStartScreenProps {
    onStart: (config: { topic: string; subtopic: string; examProfile: string; questionCount: number }) => void;
}

export const SprintStartScreen: React.FC<SprintStartScreenProps> = ({ onStart }) => {
    const [examProfile, setExamProfile] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [sprintStats, setSprintStats] = useState<any>(null);
    const [isStarting, setIsStarting] = useState(false);

    // Load exam profile and stats
    useEffect(() => {
        const loadData = async () => {
            const profile = localStorage.getItem('examProfile') || '';
            setExamProfile(profile);

            // Load sprint stats
            try {
                const stats = await fetchSprintPerformance();
                if (stats && stats.length > 0) {
                    const totalSprints = stats.length;
                    // RPC returns 'accuracy' directly as percentage
                    const avgAccuracy = stats.reduce((sum: number, s: any) => sum + (s.accuracy || 0), 0) / totalSprints;
                    // Best performance based on accuracy * questions
                    const bestScore = totalSprints > 0
                        ? Math.max(...stats.map((s: any) => Math.round((s.accuracy || 0) * (s.total_questions || 0) / 10)))
                        : 0;

                    setSprintStats({
                        totalSprints,
                        bestScore,
                        avgAccuracy: avgAccuracy.toFixed(1),
                    });
                }
            } catch (err) {
                console.error('Failed to load sprint stats:', err);
            }
        };
        loadData();
    }, []);

    const handleStart = () => {
        if (!examProfile) {
            alert('Please set your exam profile in Settings first!');
            return;
        }
        if (!selectedTopic) {
            alert('Please select a topic');
            return;
        }

        setIsStarting(true);
        onStart({
            topic: selectedTopic,
            subtopic: selectedSubtopic || 'All Subtopics', // Fallback
            examProfile,
            questionCount
        });
    };

    const topics = examProfile ? getTopicOptions(examProfile) : [];
    const subtopics = (examProfile && selectedTopic) ? getSubtopicOptions(examProfile, selectedTopic) : [];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary/10 via-blue-50 to-purple-50 rounded-3xl p-10 text-center shadow-sm border border-white/50">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 shadow-inner">
                    <Zap className="w-8 h-8 text-emerald-600 fill-emerald-600" />
                </div>
                <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight">Speed Audit Mode</h1>
                <p className="text-slate-600 max-w-lg mx-auto text-lg leading-relaxed">
                    Test your reflexes. 45 seconds per question. <br />
                    <span className="font-semibold text-emerald-600">Speed determines your score.</span>
                </p>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                Your Stats
                            </h3>

                            {sprintStats ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Best Score</span>
                                        <div className="text-2xl font-bold text-slate-800 mt-1">{sprintStats.bestScore}</div>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Sprints</span>
                                        <div className="text-2xl font-bold text-slate-800 mt-1">{sprintStats.totalSprints}</div>
                                    </div>
                                    <div className="col-span-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Avg Accuracy</span>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{sprintStats.avgAccuracy}%</div>
                                        </div>
                                        <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm">Complete a sprint to unlock stats</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-3xl border border-orange-100/50">
                        <h4 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                            The Rules
                        </h4>
                        <ul className="space-y-3">
                            {[
                                { icon: "⚡", text: "45s Timer - Strict Cutoff" },
                                { icon: "🎯", text: "+10pts for Correct Answer" },
                                { icon: "🚀", text: "+10pts Speed Bonus (Max 20)" },
                                { icon: "❌", text: "0pts for Wrong / Timeout" }
                            ].map((rule, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-white/60 p-2 rounded-lg">
                                    <span className="text-lg">{rule.icon}</span>
                                    <span>{rule.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Configuration */}
                <div className="lg:col-span-8">
                    <Card className="border-0 shadow-xl overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-emerald-400 to-blue-500" />
                        <CardContent className="p-8 space-y-8">

                            {/* Topic Selection */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Topic</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <select
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700"
                                        value={selectedTopic}
                                        onChange={(e) => {
                                            setSelectedTopic(e.target.value);
                                            setSelectedSubtopic('');
                                        }}
                                    >
                                        <option value="">-- Choose a Topic --</option>
                                        {topics.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700 disabled:opacity-50"
                                        value={selectedSubtopic}
                                        onChange={(e) => setSelectedSubtopic(e.target.value)}
                                        disabled={!selectedTopic || subtopics.length === 0}
                                    >
                                        <option value="">-- All Subtopics --</option>
                                        {subtopics.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Question Count */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Number of Questions</label>
                                <div className="flex gap-4">
                                    {[10, 20, 30].map(count => (
                                        <button
                                            key={count}
                                            onClick={() => setQuestionCount(count)}
                                            className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${questionCount === count
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                                                : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                                                }`}
                                        >
                                            {count} Qs
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Start Button */}
                            <div className="pt-4">
                                <button
                                    onClick={handleStart}
                                    disabled={!selectedTopic || isStarting}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none flex items-center justify-center gap-3"
                                >
                                    {isStarting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Initializing...
                                        </>
                                    ) : (
                                        <>
                                            Start Session
                                            <Timer className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                                {!examProfile && (
                                    <p className="text-center text-sm text-red-500 mt-3 font-medium">
                                        Please set your Exam Profile in settings to continue.
                                    </p>
                                )}
                            </div>

                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
