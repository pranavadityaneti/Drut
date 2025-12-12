import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { fetchSprintPerformance } from '../../services/analyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Zap, Trophy, Target, Flame, Play, Loader2, Info, Timer, ArrowRight, StopCircle } from 'lucide-react';

interface SprintStartScreenProps {
    onStart: (config: { topic: string; subtopic: string; examProfile: string }) => void;
}

export const SprintStartScreen: React.FC<SprintStartScreenProps> = ({ onStart }) => {
    const [examProfile, setExamProfile] = useState<string>('');
    const [sprintStats, setSprintStats] = useState<any>(null);
    const [isStarting, setIsStarting] = useState(false);

    // Load exam profile and stats
    useEffect(() => {
        const loadData = async () => {
            const profile = localStorage.getItem('examProfile');
            if (profile) {
                setExamProfile(profile);
            }

            // Load sprint stats
            try {
                const stats = await fetchSprintPerformance();
                if (stats && stats.length > 0) {
                    const totalSprints = stats.length;
                    const bestScore = Math.max(...stats.map(s => s.total_questions * 15));
                    const avgAccuracy = stats.reduce((sum, s) => sum + s.accuracy, 0) / totalSprints;

                    setSprintStats({
                        totalSprints,
                        bestScore,
                        avgAccuracy: avgAccuracy.toFixed(1),
                        bestStreak: 8
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

        setIsStarting(true);
        // Use "Random" for topic and subtopic - will be ignored by backend
        onStart({
            topic: 'Mixed',
            subtopic: 'All Topics',
            examProfile
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary/10 via-blue-50 to-purple-50 rounded-3xl p-12 text-center shadow-card">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-full mb-4">
                    <Zap className="w-12 h-12 text-emerald-600" />
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-2">Ready to Sprint?</h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Test your speed and accuracy with rapid-fire questions. 45 seconds per question. No pauses. Pure focus.
                </p>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Stats */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                        <h3 className="text-lg font-bold text-foreground mb-4">Your Sprint Stats</h3>

                        {sprintStats ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Best Score</span>
                                    <span className="text-xl font-bold text-emerald-600">{sprintStats.bestScore} pts</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Total Sprints</span>
                                    <span className="text-xl font-bold text-foreground">{sprintStats.totalSprints}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Avg Accuracy</span>
                                    <span className="text-xl font-bold text-green-600">{sprintStats.avgAccuracy}%</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Best Streak</span>
                                    <span className="text-xl font-bold text-orange-600">{sprintStats.bestStreak} 🔥</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">Complete your first sprint to see stats!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Sprint Info + Start Button */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Sprint Info Card */}
                    <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200 mb-4">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium text-emerald-600">
                                    {examProfile || 'Exam profile not set'}
                                </span>
                            </div>

                            <h3 className="text-2xl font-bold text-foreground mb-2">
                                Mixed Topics Challenge
                            </h3>
                            <p className="text-gray-600">
                                Questions will be randomly selected from all topics in your {examProfile} syllabus
                            </p>
                        </div>

                        {/* Big Start Button */}
                        <button
                            onClick={handleStart}
                            disabled={!examProfile || isStarting}
                            className="w-full py-5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-2xl font-bold text-xl hover:shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isStarting ? (
                                <div className="flex items-center justify-center gap-3">
                                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Loading Questions...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-3">
                                    <Zap className="w-7 h-7" />
                                    <span>Start Sprint Challenge</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        {!examProfile && (
                            <p className="text-center text-sm text-red-500 mt-4">
                                Please set your exam profile in Settings to start sprinting
                            </p>
                        )}
                    </div>

                    {/* Rules Card */}
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-3xl border border-orange-100">
                        <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Sprint Rules
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5 text-lg">⚡</span>
                                <span><strong>45 seconds per question</strong> - Timer starts immediately after question loads</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5 text-lg">🎯</span>
                                <span><strong>Earn 10-15 points</strong> for correct answers based on your speed</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5 text-lg">⏭️</span>
                                <span><strong>Auto-advance</strong> to next question after answering or timeout</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5 text-lg">🛑</span>
                                <span><strong>Exit anytime</strong> to view your results and detailed analytics</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
