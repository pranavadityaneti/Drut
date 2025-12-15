import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuestionData } from '../../types';
import { getCurrentUser } from '../../services/authService';
import { startSession, saveSprintAttempt, finalizeSprintSession, calculateSprintScore, createRetrySession } from '../../services/sprintService';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { log } from '../../lib/log';

interface SprintSessionProps {
    config: {
        topic: string;
        subtopic: string;
        examProfile: string;
        questionCount: number;
        retryQuestions?: QuestionData[];
    };
    onExit: (sessionId: string) => void;
}

export const SprintSession: React.FC<SprintSessionProps> = ({ config, onExit }) => {
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45); // Display time
    const [sessionReady, setSessionReady] = useState(false);

    // Use refs for mutable state to avoid closure staleness in timer
    const stateRef = useRef({
        sessionId: null as string | null,
        startTime: 0, // Time when current question started
        timerId: null as number | null, // requestAnimationFrame ID
        answers: [] as any[], // Local buffer of answers
        pendingAttempts: [] as any[], // Queue for attempts made before session ID is ready
        score: 0,
        correct: 0,
        wrong: 0,
        skipped: 0
    });

    // Initialize session
    useEffect(() => {
        const init = async () => {
            try {
                const user = await getCurrentUser();
                if (!user) throw new Error('Not authenticated');

                if (config.retryQuestions) {
                    // === INSTANT RETRY MODE ===
                    // 1. Start UI immediately using provided questions
                    setQuestions(config.retryQuestions);
                    setSessionReady(true);
                    startQuestionTimer();

                    // 2. Create Session in Background
                    // We don't await this blocking the UI.
                    createRetrySession(
                        user.id,
                        config.topic,
                        config.subtopic, // subtopic
                        config.examProfile
                    ).then(sid => {
                        stateRef.current.sessionId = sid;
                        // Flush any pending attempts that happened while creating session
                        if (stateRef.current.pendingAttempts.length > 0) {
                            stateRef.current.pendingAttempts.forEach(attempt => {
                                saveSprintAttempt(sid, user.id, attempt);
                            });
                            stateRef.current.pendingAttempts = [];
                        }
                    }).catch(err => {
                        log.error('[sprint] Background retry session creation failed:', err);
                        // We might want to show a toast or error, but let them play.
                        // Attempts won't be saved until session ID exists (which won't happen here).
                        // Maybe alerting the user is safer if persistence is critical.
                    });

                } else {
                    // === REGULAR MODE ===
                    // Fetch questions and create session first (blocking)
                    const { sessionId, questions } = await startSession(
                        user.id,
                        config.topic,
                        config.questionCount,
                        config.examProfile,
                        config.subtopic
                    );
                    stateRef.current.sessionId = sessionId;
                    setQuestions(questions);
                    setSessionReady(true);
                    startQuestionTimer();
                }
            } catch (error: any) {
                log.error('[sprint] Init failed:', error);
                alert('Failed to start Sprint session. Please check your connection.');
                onExit('error');
            }
        };

        init();

        return () => stopTimer();
    }, []);

    const stopTimer = () => {
        if (stateRef.current.timerId) {
            cancelAnimationFrame(stateRef.current.timerId);
            stateRef.current.timerId = null;
        }
    };

    const startQuestionTimer = () => {
        stopTimer();
        stateRef.current.startTime = Date.now();

        const loop = () => {
            const now = Date.now();
            const elapsed = (now - stateRef.current.startTime) / 1000;
            const remaining = Math.max(0, 45 - elapsed);

            setTimeLeft(remaining);

            if (remaining <= 0) {
                handleAnswer(null, true); // Auto-submit on timeout
            } else {
                stateRef.current.timerId = requestAnimationFrame(loop);
            }
        };

        stateRef.current.timerId = requestAnimationFrame(loop);
    };

    const handleAnswer = async (optionIndex: number | null, isTimeout = false) => {
        stopTimer();

        const question = questions[currentIndex];
        if (!question) return;

        // Calculate stats
        const timeTakenMs = isTimeout ? 45000 : Math.min(45000, Date.now() - stateRef.current.startTime);

        let isCorrect = false;
        let result: 'correct' | 'wrong' | 'skipped' = 'skipped';

        if (isTimeout) {
            result = 'wrong'; // Treating timeout as wrong 
        } else if (optionIndex !== null) {
            isCorrect = optionIndex === question.correctOptionIndex;
            result = isCorrect ? 'correct' : 'wrong';
        }

        const score = calculateSprintScore(isCorrect, timeTakenMs);

        // Update local state refs
        stateRef.current.score += score;
        if (isCorrect) stateRef.current.correct++;
        else if (result === 'wrong') stateRef.current.wrong++;
        else stateRef.current.skipped++;

        // Prepare attempt object
        const attempt = {
            questionId: question.uuid, // Using UUID as required
            result,
            timeTaken: timeTakenMs,
            scoreEarned: score,
            inputMethod: isTimeout ? 'timeout' : 'click',
            questionData: question,
            selectedOptionIndex: optionIndex,
        };
        stateRef.current.answers.push(attempt);

        // Async save
        // QUEUE LOGIC: If session ID is not ready, queue it.
        getCurrentUser().then(user => {
            if (user) {
                if (stateRef.current.sessionId) {
                    // Session ready, save immediately
                    saveSprintAttempt(stateRef.current.sessionId, user.id, attempt as any);
                } else {
                    // Session creating in background, queue it
                    stateRef.current.pendingAttempts.push(attempt);
                }
            }
        });

        // Transition
        const nextIndex = currentIndex + 1;
        if (nextIndex < questions.length) {
            setCurrentIndex(nextIndex);
            startQuestionTimer();
        } else {
            finishSession();
        }
    };

    const finishSession = async () => {
        if (!stateRef.current.sessionId) return;

        // Calculate final stats
        const totalQuestions = stateRef.current.answers.length; // or questions.length
        const totalTime = stateRef.current.answers.reduce((acc, a) => acc + a.timeTaken, 0);
        const avgTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;

        await finalizeSprintSession(stateRef.current.sessionId, {
            totalQuestions,
            correctCount: stateRef.current.correct,
            wrongCount: stateRef.current.wrong,
            skippedCount: stateRef.current.skipped,
            totalScore: stateRef.current.score,
            avgTimeMs: Math.round(avgTime),
        });

        onExit(stateRef.current.sessionId);
    };

    if (!sessionReady) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-lg font-medium text-slate-600">Preparing your Sprint...</p>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const progress = (currentIndex / questions.length) * 100;
    const isUrgent = timeLeft <= 10;

    return (
        <div className="max-w-4xl mx-auto mt-6 space-y-6">
            {/* Header / StatusBar */}
            <div className="flex justify-between items-end px-2">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question {currentIndex + 1} / {questions.length}</p>
                    <div className="h-1.5 w-64 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Score</p>
                    <p className="text-3xl font-black text-emerald-600">{stateRef.current.score}</p>
                </div>
            </div>

            {/* Timer Bar */}
            <Card className={`border-2 transition-colors duration-300 ${isUrgent ? 'border-red-500 shadow-red-100' : 'border-emerald-500 shadow-emerald-50'} shadow-lg`}>
                <CardContent className="p-0">
                    <div
                        className={`h-2 transition-all duration-75 ease-linear ${isUrgent ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (timeLeft / 45) * 100)}%` }}
                    />
                    <div className="p-4 flex justify-between items-center">
                        <span className={`text-2xl font-mono font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-emerald-700'}`}>
                            {timeLeft.toFixed(1)}s
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Remaining</span>
                    </div>
                </CardContent>
            </Card>

            {/* Question Area */}
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300" key={currentIndex}>
                <h2 className="text-2xl font-medium text-slate-800 leading-relaxed p-2">
                    {currentQuestion.questionText}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            className="group relative p-6 text-left bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-4">
                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-lg text-slate-700 font-medium group-hover:text-slate-900">
                                    {option.text}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Debug/Dev Skip - Remove in prod if needed, but useful for testing */}
            {/* <div className="text-center pt-8 opacity-20 hover:opacity-100 transition-opacity">
                <button onClick={() => handleAnswer(null)} className="text-sm underline">Skip (0 pts)</button>
            </div> */}
        </div>
    );
};
