import React, { useState, useEffect } from 'react';
import { getSprintSessionData, SprintSessionData } from '../../services/sprintService';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { QuestionData } from '../../types';
import { log } from '../../lib/log';

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
                alert('Failed to load results');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sessionId]);

    if (loading || !sessionData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card>
                    <CardContent className="p-8 text-center space-y-4">
                        <p className="text-lg">Loading results...</p>
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const accuracy = sessionData.totalQuestions > 0
        ? ((sessionData.correctCount / sessionData.totalQuestions) * 100).toFixed(1)
        : '0.0';

    const avgTime = sessionData.avgTimeMs ? (sessionData.avgTimeMs / 1000).toFixed(1) : '0.0';

    return (
        <div className="max-w-4xl mx-auto mt-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-primary">Sprint Complete!</h1>
                <p className="text-lg text-muted-foreground">
                    {sessionData.topic} → {sessionData.subtopic}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                        <p className="text-3xl font-bold text-primary">{sessionData.totalScore}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                        <p className="text-3xl font-bold text-green-600">{accuracy}%</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Avg Time</p>
                        <p className="text-3xl font-bold text-blue-600">{avgTime}s</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Questions</p>
                        <p className="text-3xl font-bold">{sessionData.totalQuestions}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Stats */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Breakdown</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium text-green-700">Correct</span>
                            <span className="font-bold text-green-700">{sessionData.correctCount}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <span className="font-medium text-red-700">Wrong</span>
                            <span className="font-bold text-red-700">{sessionData.wrongCount}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">Skipped</span>
                            <span className="font-bold text-gray-700">{sessionData.skippedCount}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Missed Questions */}
            {missedQuestions.length > 0 && (
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">
                            Missed Questions ({missedQuestions.length})
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {missedQuestions.map((q, idx) => (
                                <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                                    <p className="font-medium text-sm line-clamp-2">{q.questionText}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {missedQuestions.length > 0 && (
                    <Button
                        onClick={() => onRetry(missedQuestions)}
                        className="w-full"
                    >
                        Retry Missed ({missedQuestions.length})
                    </Button>
                )}

                <Button
                    onClick={onNewSprint}
                    variant="outline"
                    className="w-full"
                >
                    Start New Sprint
                </Button>

                <Button
                    onClick={onBackToPractice}
                    variant="outline"
                    className="w-full"
                >
                    Back to Practice
                </Button>
            </div>
        </div>
    );
};
