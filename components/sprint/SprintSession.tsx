import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuestionData } from '../../types';
import { getQuestionsForUser } from '../../services/questionCacheService';
import { getCurrentUser } from '../../services/authService';
import { createSprintSession, saveSprintAttempt, finalizeSprintSession, calculateSprintScore } from '../../services/sprintService';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { log } from '../../lib/log';
import { EXAM_SPECIFIC_TOPICS } from '../../constants';

interface SprintSessionProps {
    config: {
        topic: string;
        subtopic: string;
        examProfile: string;
        retryQuestions?: QuestionData[];
    };
    onExit: (sessionId: string) => void;
}

export const SprintSession: React.FC<SprintSessionProps> = ({ config, onExit }) => {
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timer, setTimer] = useState(45);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | 'skip' | null>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const [sessionData, setSessionData] = useState({
        sessionId: null as string | null,
        score: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        attempts: [] as any[],
        totalTime: 0,
    });

    const timerRef = useRef<any>(null);
    const fetchingRef = useRef(false);

    // Initialize session
    useEffect(() => {
        const init = async () => {
            try {
                const user = await getCurrentUser();
                if (!user) throw new Error('Not authenticated');

                // Create session
                const sessionId = await createSprintSession(
                    user.id,
                    config.examProfile,
                    config.topic,
                    config.subtopic,
                    !!config.retryQuestions
                );

                setSessionData(prev => ({ ...prev, sessionId }));

                // Load initial questions
                if (config.retryQuestions) {
                    setQuestions(config.retryQuestions);
                } else {
                    await loadQuestions(user.id);
                }
            } catch (error: any) {
                log.error('[sprint] Init failed:', error);
                alert('Failed to start Sprint session');
            }
        };

        init();
    }, []);

    // Load questions
    const loadQuestions = async (userId: string) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            let targetTopic = config.topic;
            let targetSubtopic = config.subtopic;

            // Handle Mixed mode: Pick a random topic/subtopic
            if (config.topic === 'Mixed') {
                // Normalize profile key to lowercase to match constants
                const profileKey = config.examProfile.toLowerCase();
                const examTopics = EXAM_SPECIFIC_TOPICS[profileKey];

                if (examTopics && examTopics.length > 0) {
                    const randomTopicObj = examTopics[Math.floor(Math.random() * examTopics.length)];
                    targetTopic = randomTopicObj.value;
                    const subtopics = randomTopicObj.subTopics;
                    if (subtopics && subtopics.length > 0) {
                        targetSubtopic = subtopics[Math.floor(Math.random() * subtopics.length)];
                    }
                    console.log(`[Sprint] Selected random topic: ${targetTopic}, subtopic: ${targetSubtopic}`);
                } else {
                    console.warn(`[Sprint] No topics found for profile: ${config.examProfile} (key: ${profileKey})`);
                    // Fallback to a generic topic if possible, or keep 'Mixed' which might fail generation
                }
            }

            console.log(`[Sprint] Loading questions for: ${config.examProfile}, ${targetTopic}, ${targetSubtopic}`);

            const { questions: newQuestions } = await getQuestionsForUser(
                userId,
                config.examProfile,
                targetTopic,
                targetSubtopic,
                5, // Load fewer to mix more often
                'Medium'
            );

            setQuestions(prev => [...prev, ...newQuestions]);
        } catch (error: any) {
            log.error('[sprint] Failed to load questions:', error);
        } finally {
            fetchingRef.current = false;
        }
    };

    // Buffer more questions when running low
    useEffect(() => {
        const loadMore = async () => {
            if (config.retryQuestions) return; // Don't load more for retry

            const remaining = questions.length - currentIndex;
            if (remaining < 5 && !fetchingRef.current) {
                const user = await getCurrentUser();
                if (user) await loadQuestions(user.id);
            }
        };

        loadMore();
    }, [currentIndex, questions.length]);

    // Timer countdown
    useEffect(() => {
        if (showFeedback) return; // Pause during feedback

        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    handleTimeout();
                    return 45;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIndex, showFeedback]);

    // Handle timeout (auto-skip)
    const handleTimeout = () => {
        handleSkip('timeout');
    };

    // Handle answer
    const handleAnswer = async (optionIndex: number) => {
        if (showFeedback) return; // Prevent double-click

        const question = questions[currentIndex];
        if (!question) return;

        const isCorrect = optionIndex === question.correctOptionIndex;
        const timeTaken = (45 - timer) * 1000; // Convert to ms
        const score = calculateSprintScore(isCorrect, timeTaken);

        // Show feedback
        setSelectedOption(optionIndex);
        setFeedbackType(isCorrect ? 'correct' : 'wrong');
        setShowFeedback(true);

        // Save attempt
        const attempt = {
            questionId: question.questionText, // Using text as ID for now
            result: isCorrect ? 'correct' : 'wrong',
            timeTaken,
            scoreEarned: score,
            inputMethod: 'click',
            questionData: question,
            selectedOptionIndex: optionIndex,
        };

        if (sessionData.sessionId) {
            const user = await getCurrentUser();
            if (user) {
                await saveSprintAttempt(sessionData.sessionId, user.id, attempt as any);
            }
        }

        // Update session data
        setSessionData(prev => ({
            ...prev,
            score: prev.score + score,
            [isCorrect ? 'correct' : 'wrong']: prev[isCorrect ? 'correct' : 'wrong'] + 1,
            attempts: [...prev.attempts, attempt],
            totalTime: prev.totalTime + timeTaken,
        }));

        // Auto-advance after 600ms
        setTimeout(() => {
            setShowFeedback(false);
            setSelectedOption(null);
            setFeedbackType(null);
            setCurrentIndex(prev => prev + 1);
            setTimer(45);
        }, 600);
    };

    // Handle skip
    const handleSkip = async (method: 'click' | 'timeout') => {
        const question = questions[currentIndex];
        if (!question) return;

        const timeTaken = (45 - timer) * 1000;

        const attempt = {
            questionId: question.questionText,
            result: 'skipped',
            timeTaken,
            scoreEarned: 0,
            inputMethod: method === 'timeout' ? 'timeout' : 'click',
            questionData: question,
            selectedOptionIndex: undefined,
        };

        if (sessionData.sessionId) {
            const user = await getCurrentUser();
            if (user) {
                await saveSprintAttempt(sessionData.sessionId, user.id, attempt as any);
            }
        }

        setSessionData(prev => ({
            ...prev,
            skipped: prev.skipped + 1,
            attempts: [...prev.attempts, attempt],
            totalTime: prev.totalTime + timeTaken,
        }));

        if (method === 'timeout') {
            // Show skip feedback briefly
            setFeedbackType('skip');
            setShowFeedback(true);
            setTimeout(() => {
                setShowFeedback(false);
                setFeedbackType(null);
                setCurrentIndex(prev => prev + 1);
                setTimer(45);
            }, 600);
        } else {
            setCurrentIndex(prev => prev + 1);
            setTimer(45);
        }
    };

    // Handle exit
    const handleExit = async () => {
        if (!sessionData.sessionId) return;

        const totalQuestions = sessionData.attempts.length;
        const avgTime = totalQuestions > 0 ? sessionData.totalTime / totalQuestions : 0;

        await finalizeSprintSession(sessionData.sessionId, {
            totalQuestions,
            correctCount: sessionData.correct,
            wrongCount: sessionData.wrong,
            skippedCount: sessionData.skipped,
            totalScore: sessionData.score,
            avgTimeMs: Math.round(avgTime),
        });

        onExit(sessionData.sessionId);
    };

    const currentQuestion = questions[currentIndex];

    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card>
                    <CardContent className="p-8 text-center space-y-4">
                        <p className="text-lg">Loading questions...</p>
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto mt-8 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Question {currentIndex + 1}</p>
                    <p className="text-xl font-bold">Score: {sessionData.score}</p>
                </div>
                <Button variant="outline" onClick={handleExit}>
                    Exit Results
                </Button>
            </div>

            {/* Timer */}
            <Card className={timer <= 10 ? 'border-red-500' : ''}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Time Remaining:</span>
                        <span className={`text-2xl font-bold ${timer <= 10 ? 'text-red-500' : 'text-primary'}`}>
                            {timer}s
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                            className={`h-2 rounded-full transition-all ${timer <= 10 ? 'bg-red-500' : 'bg-primary'}`}
                            style={{ width: `${(timer / 45) * 100}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Question Card */}
            <Card className={showFeedback ? (feedbackType === 'correct' ? 'border-green-500' : 'border-red-500') : ''}>
                <CardContent className="p-6 space-y-6">
                    <div className="text-lg font-medium">{currentQuestion.questionText}</div>

                    <div className="grid grid-cols-1 gap-3">
                        {currentQuestion.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={showFeedback}
                                className={`p-4 text-left border-2 rounded-lg transition-all ${showFeedback && selectedOption === idx
                                    ? feedbackType === 'correct'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-red-500 bg-red-50'
                                    : showFeedback && idx === currentQuestion.correctOptionIndex
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-300 hover:border-primary hover:bg-accent'
                                    } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                                {option.text}
                            </button>
                        ))}
                    </div>

                    {/* Skip Button */}
                    <Button
                        variant="outline"
                        onClick={() => handleSkip('click')}
                        disabled={showFeedback}
                        className="w-full"
                    >
                        Skip
                    </Button>
                </CardContent>
            </Card>

            {/* Feedback Overlay */}
            {showFeedback && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-6xl">
                        {feedbackType === 'correct' && <span className="text-green-500">✓</span>}
                        {feedbackType === 'wrong' && <span className="text-red-500">✗</span>}
                        {feedbackType === 'skip' && <span className="text-gray-500">⏭</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
