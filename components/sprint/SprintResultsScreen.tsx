import React, { useState, useEffect } from 'react';
import { getSprintSessionData, SprintSessionData, SprintAttempt } from '../../services/sprintService';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { QuestionData } from '../../types';
import { log } from '../../lib/log';
import { Trophy, Clock, Target, AlertCircle, RotateCcw, Play, CheckCircle2, XCircle, Timer, Grid } from 'lucide-react';

interface SprintResultsScreenProps {
    sessionId: string;
    onRetry: (missedQuestions: QuestionData[]) => void;
    onNewSprint: () => void;
    onBackToPractice: () => void;
}

export const SprintResultsScreen: React.FC<SprintResultsScreenProps> = ({
    sessionId,
    onRetry,
    onNewSprint,
    onBackToPractice,
}) => {
    const [sessionData, setSessionData] = useState<SprintSessionData | null>(null);
    const [missedQuestions, setMissedQuestions] = useState<QuestionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getSprintSessionData(sessionId);
                setSessionData(data);

                // Get missed/skipped questions
                const missed = data.attempts?.filter(a => a.result !== 'correct') || [];
                setMissedQuestions(missed.map(a => a.questionData));
            } catch (error: any) {
                log.error('[sprint] Failed to load results:', error);
                // alert('Failed to load results');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sessionId]);

    if (loading || !sessionData) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-slate-500">Calculating your speed...</p>
                </div>
            </div>
        );
    }

    const accuracy = sessionData.totalQuestions > 0
        ? ((sessionData.correctCount / sessionData.totalQuestions) * 100).toFixed(0)
        : '0';

    const avgTime = sessionData.avgTimeMs ? (sessionData.avgTimeMs / 1000).toFixed(1) : '0.0';

    // Helper to determine speed color
    const getAttemptColor = (attempt: SprintAttempt) => {
        if (attempt.result !== 'correct') return 'bg-red-500';
        // Correct answers
        if (attempt.timeTaken < 10000) return 'bg-emerald-500'; // Super fast (< 10s)
        if (attempt.timeTaken < 25000) return 'bg-emerald-400'; // Fast (< 25s)
        if (attempt.timeTaken < 35000) return 'bg-yellow-400'; // Moderate
        return 'bg-orange-400'; // Slow but correct
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center space-y-2 py-6">
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">Sprint Report</h1>
                <p className="text-lg text-slate-500 font-medium">
                    {sessionData.topic} <span className="mx-2">•</span> {sessionData.subtopic}
                </p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg bg-white overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Score</span>
                            <Trophy className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-4xl font-black text-slate-800 group-hover:scale-110 transition-transform origin-left">{sessionData.totalScore}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
                            <Target className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-4xl font-black text-slate-800 group-hover:scale-110 transition-transform origin-left">{accuracy}%</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Time</span>
                            <Clock className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-4xl font-black text-slate-800 group-hover:scale-110 transition-transform origin-left">{avgTime}s</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missed</span>
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-4xl font-black text-slate-800 group-hover:scale-110 transition-transform origin-left">{missedQuestions.length}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Speed Grid */}
                <div className="lg:col-span-2">
                    <Card className="h-auto border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Grid className="w-5 h-5 text-slate-400" />
                                <h3 className="text-lg font-bold text-slate-800">Speed Grid</h3>
                            </div>

                            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                                {sessionData.attempts?.map((attempt, idx) => (
                                    <div key={idx} className="group relative">
                                        <div
                                            className={`
                                                aspect-square rounded-xl flex items-center justify-center font-bold text-white shadow-sm transition-transform hover:scale-110
                                                cursor-help
                                                ${getAttemptColor(attempt)}
                                            `}
                                        >
                                            {idx + 1}
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                            {(attempt.timeTaken / 1000).toFixed(1)}s • {attempt.result === 'correct' ? `+${attempt.scoreEarned} pts` : 'Wrong'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-4 mt-8 justify-center">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" /> Super Fast
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <div className="w-3 h-3 rounded-full bg-emerald-400" /> Fast
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" /> Moderate
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <div className="w-3 h-3 rounded-full bg-orange-400" /> Slow
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <div className="w-3 h-3 rounded-full bg-red-500" /> Wrong
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis List */}
                    <div className="mt-8 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <h3 className="text-lg font-bold text-slate-800">Detailed Analysis</h3>
                        {sessionData.attempts?.map((attempt, idx) => (
                            <div key={idx} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <button
                                    onClick={() => setExpandedId(expandedId === attempt.questionId ? null : attempt.questionId)}
                                    className="w-full flex items-center justify-between p-4 text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                                            ${attempt.result === 'correct' ? 'bg-emerald-500' : 'bg-red-500'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 line-clamp-1">{attempt.questionData.questionText}</p>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {(attempt.timeTaken / 1000).toFixed(1)}s
                                                </span>
                                                <span className={`${attempt.result === 'correct' ? 'text-emerald-600' : 'text-red-600'} font-medium uppercase`}>
                                                    {attempt.result}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-slate-400">
                                        {expandedId === attempt.questionId ? '−' : '+'}
                                    </div>
                                </button>

                                {expandedId === attempt.questionId && (
                                    <div className="px-4 pb-4 pt-0 border-t bg-slate-50/50">
                                        <div className="pt-4 space-y-4">
                                            <div className="bg-slate-100 p-3 rounded-lg text-sm text-slate-700">
                                                {attempt.questionData.questionText}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">You Answered</span>
                                                    <div className={`p-2 rounded font-medium ${attempt.result === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {(() => {
                                                            const OPTIONS = ['A', 'B', 'C', 'D'];
                                                            const idx = attempt.selectedOptionIndex;
                                                            return (idx !== undefined && idx !== null && OPTIONS[idx]) ? OPTIONS[idx] : 'Timed Out';
                                                        })()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Correct Answer</span>
                                                    <div className="p-2 rounded font-medium bg-emerald-100 text-emerald-800">
                                                        {['A', 'B', 'C', 'D'][attempt.questionData.correctOptionIndex]}
                                                    </div>
                                                </div>
                                            </div>

                                            {attempt.questionData.fsm_explanation && (
                                                <div>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Explanation</span>
                                                    <p className="text-slate-600 text-sm leading-relaxed">
                                                        {attempt.questionData.fsm_explanation}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions Panel */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-0 shadow-lg h-full">
                        <CardContent className="p-6 flex flex-col justify-center h-full space-y-4">
                            {missedQuestions.length > 0 ? (
                                <Button
                                    onClick={() => onRetry(missedQuestions)}
                                    className="w-full py-6 text-lg bg-orange-500 hover:bg-orange-600 shadow-orange-200 shadow-lg"
                                >
                                    <RotateCcw className="w-5 h-5 mr-2" />
                                    Retry Missed ({missedQuestions.length})
                                </Button>
                            ) : (
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-center font-medium mb-2 border border-emerald-100">
                                    🎉 Perfect Score! Amazing!
                                </div>
                            )}

                            <Button
                                onClick={onNewSprint}
                                className="w-full py-6 text-lg bg-slate-900 hover:bg-slate-800 shadow-lg"
                            >
                                <Play className="w-5 h-5 mr-2" />
                                Start New Sprint
                            </Button>

                            <Button
                                onClick={onBackToPractice}
                                variant="outline"
                                className="w-full py-6 border-2 hover:bg-slate-50"
                            >
                                Back to Practice
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
