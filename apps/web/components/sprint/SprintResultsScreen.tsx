import React, { useState, useEffect } from 'react';
import { getSprintSessionData, SprintSessionData, SprintAttempt } from '@drut/shared'; // from ../../services/sprintService';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { LatexText } from '../ui/LatexText';
import { QuestionData } from '@drut/shared';
import { log } from '@drut/shared'; // from ../../lib/log';
import { Trophy, Clock, Target, AlertCircle, RotateCcw, Play, CheckCircle2, XCircle, Timer, Grid, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { generateSessionAnalysis } from '../../../../packages/shared/src/services/geminiService';
import { SolutionView } from '../SolutionView';

interface SprintResultsScreenProps {
    sessionId: string;
    onRetry: (missedQuestions: QuestionData[]) => void;
    onNewSprint: () => void;
    onBackToPractice: (subtopic?: string) => void;
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
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getSprintSessionData(sessionId);
                setSessionData(data);

                // Get missed/skipped questions
                const missed = data.attempts?.filter(a => a.result !== 'correct') || [];
                setMissedQuestions(missed.map(a => a.questionData));

                // Generate AI analysis
                generateAIAnalysis(data);
            } catch (error: any) {
                log.error('[sprint] Failed to load results:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sessionId]);

    const generateAIAnalysis = async (data: SprintSessionData) => {
        setAnalysisLoading(true);
        try {
            const accuracy = data.totalQuestions > 0
                ? (data.correctCount / data.totalQuestions) * 100
                : 0;
            const avgTimeSeconds = data.avgTimeMs ? data.avgTimeMs / 1000 : 0;
            const missedCount = data.totalQuestions - data.correctCount;

            const analysis = await generateSessionAnalysis({
                score: data.totalScore,
                accuracy,
                avgTime: avgTimeSeconds,
                missedCount,
                topic: data.topic,
                subtopic: data.subtopic,
                totalQuestions: data.totalQuestions,
            });
            setAiAnalysis(analysis);
        } catch (error: any) {
            log.error('[sprint] Failed to generate AI analysis:', error);
            setAiAnalysis(null);
        } finally {
            setAnalysisLoading(false);
        }
    };

    if (loading || !sessionData) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto" />
                    <p className="text-[13px] text-[var(--color-ink-3)]">Calculating your speed…</p>
                </div>
            </div>
        );
    }

    const accuracy = sessionData.totalQuestions > 0
        ? ((sessionData.correctCount / sessionData.totalQuestions) * 100).toFixed(0)
        : '0';

    const avgTime = sessionData.avgTimeMs ? (sessionData.avgTimeMs / 1000).toFixed(1) : '0.0';
    const needsRePractice = parseFloat(accuracy) < 50;

    // Speed band → muted-fill + colored dot (replaces saturated bg-red/yellow/orange)
    const getAttemptDot = (attempt: SprintAttempt) => {
        if (attempt.result !== 'correct') return 'bg-[var(--color-destructive)]';
        if (attempt.timeTaken < 10000) return 'bg-[var(--color-primary)]';   // super fast
        if (attempt.timeTaken < 25000) return 'bg-[#3d7a0f]';                // fast (deeper lime)
        if (attempt.timeTaken < 35000) return 'bg-[var(--color-accent-warm)]'; // moderate (coral)
        return 'bg-[var(--color-accent-warm-foreground)]';                   // slow but correct
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center flex flex-col gap-1 py-4">
                <p className="label-uppercase">Sprint report</p>
                <h1 className="text-[36px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)] mt-1">
                    {sessionData.topic}
                </h1>
                <p className="text-[14px] text-[var(--color-ink-3)]">{sessionData.subtopic}</p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="group relative overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)]">
                                <Trophy className="w-4 h-4" />
                            </span>
                        </div>
                        <p className="label-uppercase mt-5">Total score</p>
                        <p className="text-[36px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-ink-1)] mt-1.5">{sessionData.totalScore}</p>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)]">
                                <Target className="w-4 h-4" />
                            </span>
                        </div>
                        <p className="label-uppercase mt-5">Accuracy</p>
                        <p className="text-[36px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-ink-1)] mt-1.5">{accuracy}%</p>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-center">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)]">
                                <Clock className="w-4 h-4" />
                            </span>
                        </div>
                        <p className="label-uppercase mt-5">Avg time</p>
                        <p className="text-[36px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-ink-1)] mt-1.5">{avgTime}s</p>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden ring-hairline-strong" style={{ background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,233,221,0.55) 100%)' }}>
                    <span aria-hidden className="absolute left-5 right-5 bottom-0 h-[2px] rounded-full bg-[var(--color-accent-warm)]" />
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-center">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent-warm-soft)] text-[var(--color-accent-warm-foreground)]">
                                <AlertCircle className="w-4 h-4" />
                            </span>
                        </div>
                        <p className="label-uppercase mt-5">Missed</p>
                        <p className="text-[36px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-accent-warm)] mt-1.5">{missedQuestions.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* AI Session Analysis */}
            <Card>
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-[var(--color-ink-3)]" />
                        <p className="label-uppercase">Session analysis</p>
                    </div>
                    {analysisLoading ? (
                        <div className="flex items-center gap-3 text-[13px] text-[var(--color-ink-3)]">
                            <div className="animate-spin h-4 w-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
                            <span>Generating personalized analysis…</span>
                        </div>
                    ) : aiAnalysis ? (
                        <p className="text-[14px] text-[var(--color-ink-2)] leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
                    ) : (
                        <p className="text-[13px] text-[var(--color-ink-3)]">Analysis unavailable. Complete more sprints to unlock insights.</p>
                    )}
                </CardContent>
            </Card>

            {/* Re-Practice Prompt */}
            {needsRePractice && (
                <Card className="relative overflow-hidden ring-hairline-strong">
                    <span aria-hidden className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-[var(--color-accent-warm)]" />
                    <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-accent-warm-soft)] text-[var(--color-accent-warm-foreground)] shrink-0">
                                <BookOpen className="w-5 h-5" />
                            </span>
                            <div className="flex-1">
                                <p className="label-uppercase">Recommendation</p>
                                <h3 className="text-[16px] font-semibold tracking-tight text-[var(--color-ink-1)] mt-1">
                                    Practice recommended
                                </h3>
                                <p className="text-[13px] text-[var(--color-ink-3)] mt-2 mb-4 leading-relaxed">
                                    Your accuracy on <strong className="text-[var(--color-ink-1)] font-semibold">{sessionData.subtopic}</strong> is below 50%. We recommend focused practice on this subtopic.
                                </p>
                                <Button onClick={() => onBackToPractice(sessionData.subtopic)} variant="ink">
                                    <BookOpen className="w-4 h-4" />
                                    Practice {sessionData.subtopic}
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Speed Grid */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 mb-5">
                                <Grid className="w-4 h-4 text-[var(--color-ink-3)]" />
                                <p className="label-uppercase">Speed grid</p>
                            </div>

                            <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5">
                                {sessionData.attempts?.map((attempt, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="aspect-square rounded-[10px] flex items-center justify-center font-semibold text-[12px] ring-hairline bg-[var(--color-card)] cursor-help transition-transform hover:scale-110 num-tabular">
                                            <span className={`absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full ${getAttemptDot(attempt)}`} aria-hidden />
                                            <span className="text-[var(--color-ink-1)]">{idx + 1}</span>
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-[var(--color-ink-1)] text-white text-[11px] rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none num-tabular">
                                            {(attempt.timeTaken / 1000).toFixed(1)}s · {attempt.scoreEarned > 0 ? '+' : ''}{attempt.scoreEarned} pts
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-4 mt-6 justify-center">
                                <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-ink-3)]">
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" /> Super fast
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-ink-3)]">
                                    <div className="w-2 h-2 rounded-full bg-[#3d7a0f]" /> Fast
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-ink-3)]">
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent-warm)]" /> Moderate
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-ink-3)]">
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent-warm-foreground)]" /> Slow
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-ink-3)]">
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-destructive)]" /> Wrong
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis List */}
                    <div className="mt-6 space-y-2.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <p className="label-uppercase mb-2">Detailed analysis</p>
                        {sessionData.attempts?.map((attempt, idx) => (
                            <div key={idx} className="bg-[var(--color-card)] ring-hairline rounded-[14px] overflow-hidden transition-shadow card-hover">
                                <button
                                    onClick={() => setExpandedId(expandedId === attempt.questionId ? null : attempt.questionId)}
                                    className="w-full flex items-center justify-between p-3 text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex-shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] font-semibold text-[12px] num-tabular ${
                                            attempt.result === 'correct'
                                                ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                                                : 'bg-[#fde7e5] text-[var(--color-destructive)]'
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-[var(--color-ink-1)] line-clamp-1"><LatexText text={attempt.questionData.questionText} /></p>
                                            <div className="flex items-center gap-3 text-[11px] text-[var(--color-ink-3)] mt-0.5 num-tabular">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {(attempt.timeTaken / 1000).toFixed(1)}s
                                                </span>
                                                <span className={`font-semibold uppercase tracking-wider ${
                                                    attempt.result === 'correct' ? 'text-[#3d7a0f]' : 'text-[var(--color-destructive)]'
                                                }`}>
                                                    {attempt.result}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[var(--color-ink-3)]">
                                        {expandedId === attempt.questionId ? '−' : '+'}
                                    </div>
                                </button>

                                {expandedId === attempt.questionId && (
                                    <div className="px-3 pb-3 pt-0 border-t border-[var(--color-ink-5)] bg-[var(--color-muted)]">
                                        <div className="pt-3 space-y-3">
                                            <div className="bg-[var(--color-card)] ring-hairline p-3 rounded-[10px] text-[13px] text-[var(--color-ink-2)] leading-relaxed">
                                                <LatexText text={attempt.questionData.questionText} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="label-uppercase mb-1.5">You answered</p>
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold tracking-tight bg-[var(--color-muted)] ${
                                                        attempt.result === 'correct' ? 'text-[#3d7a0f]' : 'text-[var(--color-destructive)]'
                                                    }`}>
                                                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${
                                                            attempt.result === 'correct' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-destructive)]'
                                                        }`} />
                                                        {(() => {
                                                            const OPTIONS = ['A', 'B', 'C', 'D'];
                                                            const idx = attempt.selectedOptionIndex;
                                                            return (idx !== undefined && idx !== null && OPTIONS[idx]) ? OPTIONS[idx] : 'Timed out';
                                                        })()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="label-uppercase mb-1.5">Correct answer</p>
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold tracking-tight bg-[var(--color-muted)] text-[#3d7a0f]">
                                                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                                                        {['A', 'B', 'C', 'D'][attempt.questionData.correctOptionIndex]}
                                                    </div>
                                                </div>
                                            </div>

                                            {attempt.result !== 'correct' && (
                                                <div className="mt-3">
                                                    <SolutionView question={attempt.questionData} />
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
                <div className="lg:col-span-1">
                    <Card className="sticky top-8">
                        <CardContent className="p-5 space-y-3">
                            {missedQuestions.length > 0 ? (
                                <Button
                                    onClick={() => onRetry(missedQuestions)}
                                    variant="accent"
                                    className="w-full h-12 text-[14px]"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Retry missed ({missedQuestions.length})
                                </Button>
                            ) : (
                                <div className="relative p-4 bg-[var(--color-muted)] ring-hairline rounded-[12px] text-center text-[13px] font-medium text-[var(--color-ink-1)] overflow-hidden">
                                    <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[var(--color-primary)]" />
                                    Perfect score
                                </div>
                            )}

                            <Button onClick={onNewSprint} variant="ink" className="w-full h-12 text-[14px]">
                                <Play className="w-4 h-4" />
                                Start new sprint
                            </Button>

                            <Button
                                onClick={() => onBackToPractice(needsRePractice ? sessionData.subtopic : undefined)}
                                variant="outline"
                                className="w-full"
                            >
                                {needsRePractice ? `Practice ${sessionData.subtopic}` : 'Back to practice'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
