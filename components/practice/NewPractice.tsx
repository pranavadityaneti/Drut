import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { QuestionData } from '../../types';
import { getQuestionsForUser } from '../../services/questionCacheService';
import { getCurrentUser } from '../../services/authService';
import { getPreloadedQuestion } from '../../services/preloaderService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { QuestionCard } from '../QuestionCard';
import { EXAM_TAXONOMY, getExam, getTopic, getExamOptions, getTopicOptions, getSubtopicOptions } from '../../lib/taxonomy';
import { log } from '../../lib/log';
import { saveAttemptAndUpdateMastery, getQuestionByFsmTag } from '../../services/performanceService';
import { ReflectionPanel } from './ReflectionPanel';
import { FsmPanel } from './FsmPanel';
import { ReinforceMenu } from './ReinforceMenu';
import { MiniPractice } from './MiniPractice';
import { FeedbackSummary } from './FeedbackSummary';
import { PrescriptionChip } from './PrescriptionChip';
import { SuccessToast } from './SuccessToast';
import { InterventionModal } from './InterventionModal';
import { ToastContainer, useToast } from '../ui/toast';

type PracticeState =
    | 'question'
    | 'success-toast'
    | 'intervention'
    | 'reflection'
    | 'fsm'
    | 'reinforce'
    | 'mini-practice'
    | 'feedback'
    | 'complete';

export const NewPractice: React.FC = () => {
    const [examProfile, setExamProfile] = useState<string | null>(null);
    const [topic, setTopic] = useState<string | null>(null);
    const [currentSubTopics, setCurrentSubTopics] = useState<string[]>([]);
    const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

    const [questionCache, setQuestionCache] = useState<{ [key: string]: QuestionData[] }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [questionData, setQuestionData] = useState<QuestionData | null>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [timeTaken, setTimeTaken] = useState<number>(0);
    const [reflectionChoice, setReflectionChoice] = useState<string | null>(null);

    const [practiceState, setPracticeState] = useState<PracticeState>('question');

    // Mastery Loop state
    const [currentQuestionUuid, setCurrentQuestionUuid] = useState<string | null>(null);
    const [currentFsmTag, setCurrentFsmTag] = useState<string | null>(null);
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean>(false);
    const [lastAnswerFast, setLastAnswerFast] = useState<boolean>(false);
    const [currentStreak, setCurrentStreak] = useState<number>(0);

    // Toast notifications
    const { toasts, addToast, dismissToast } = useToast();

    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const fetchingRef = useRef<boolean>(false);
    const questionCacheRef = useRef<{ [key: string]: QuestionData[] }>({});

    // Get topic LABEL from taxonomy (for database matching)
    const topicLabel = useMemo(() => {
        if (!examProfile || !topic) return null;
        const topicDef = getTopic(examProfile, topic);
        return topicDef?.label || topic;
    }, [examProfile, topic]);

    const currentTopicInfo = useMemo(() => {
        // Use LABELS for database queries, not values
        return { topic: topicLabel, subTopic: selectedSubTopic };
    }, [topicLabel, selectedSubTopic]);

    const ensureQuestionBuffer = useCallback(
        async (startIndex: number) => {
            const { subTopic: currentSubTopic, topic: currentTopic } = currentTopicInfo;
            if (!currentSubTopic || !currentTopic || !examProfile || fetchingRef.current) return;

            const currentCount = questionCacheRef.current[currentSubTopic]?.length || 0;
            const needed = startIndex + 1 - currentCount;

            if (needed <= 0) return;

            fetchingRef.current = true;
            try {
                const user = await getCurrentUser();
                if (!user) {
                    log.warn('[cache] No user found, cannot fetch questions');
                    return;
                }

                const batchSize = Math.max(needed, 1);
                const { questions, metadata } = await getQuestionsForUser(
                    user.id,
                    examProfile,
                    currentTopic,
                    currentSubTopic,
                    batchSize,
                    difficulty
                );

                if (questions.length > 0) {
                    log.info(
                        `[cache] Loaded ${questions.length} questions (${metadata.cached} cached, ${metadata.generated} generated)`
                    );

                    setQuestionCache((prevCache) => {
                        const newCache = { ...prevCache };
                        const existing = newCache[currentSubTopic] || [];
                        newCache[currentSubTopic] = [...existing, ...(questions as QuestionData[])];
                        questionCacheRef.current = newCache;
                        return newCache;
                    });
                }
            } catch (err: any) {
                log.error(`Buffer fetch failed:`, err.message);

                if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
                    setError(
                        '⚠️ API quota limit reached. Showing questions from cache. New questions will be available soon.'
                    );
                }
            } finally {
                fetchingRef.current = false;
            }
        },
        [currentTopicInfo, examProfile, difficulty]
    );

    const loadQuestion = useCallback(
        async (index: number) => {
            setQuestionData(null);
            setSelectedOption(null);
            setTimeTaken(0);
            setReflectionChoice(null);
            setPracticeState('question');
            stopTimer();

            const { subTopic: currentSubTopic, topic: currentTopic } = currentTopicInfo;
            if (!currentSubTopic || !currentTopic || !examProfile) return;

            ensureQuestionBuffer(index);

            if (index === 0) {
                const preloaded = getPreloadedQuestion(examProfile, currentTopic, currentSubTopic);
                if (preloaded) {
                    setQuestionData(preloaded);
                    setCurrentQuestionUuid(preloaded.uuid);
                    setCurrentFsmTag(preloaded.fsmTag);
                    setQuestionCache((prev) => {
                        const newCache = { ...prev, [currentSubTopic]: [preloaded] };
                        questionCacheRef.current = newCache;
                        return newCache;
                    });
                    startTimer();
                    return;
                }
            }

            if (questionCache[currentSubTopic]?.[index]) {
                const cachedQuestion = questionCache[currentSubTopic][index];
                setQuestionData(cachedQuestion);
                setCurrentQuestionUuid(cachedQuestion.uuid);
                setCurrentFsmTag(cachedQuestion.fsmTag);
                startTimer();
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const user = await getCurrentUser();
                if (!user) {
                    throw new Error('Please log in to practice');
                }

                const { questions } = await getQuestionsForUser(
                    user.id,
                    examProfile,
                    currentTopic,
                    currentSubTopic,
                    1,
                    difficulty
                );

                if (questions.length === 0) {
                    throw new Error('No questions available. Please try again later.');
                }

                const data = questions[0];
                setQuestionData(data);
                setCurrentQuestionUuid(data.uuid);
                setCurrentFsmTag(data.fsmTag);
                setQuestionCache((prevCache) => {
                    const newCache = { ...prevCache };
                    if (!newCache[currentSubTopic]) newCache[currentSubTopic] = [];
                    newCache[currentSubTopic][index] = data;
                    questionCacheRef.current = newCache;
                    return newCache;
                });

                startTimer();
                ensureQuestionBuffer(index + 1);
            } catch (err: any) {
                if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
                    setError(
                        "⚠️ API quota limit reached. We're showing you questions from cache. New questions will be available soon."
                    );
                } else {
                    setError(err.message || 'An unknown error occurred.');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [currentTopicInfo, questionCache, ensureQuestionBuffer, examProfile]
    );

    const loadProfileSettings = useCallback((profile: string | null) => {
        // Use new taxonomy - Single Source of Truth
        const defaultExam = EXAM_TAXONOMY[0]?.value || 'cat';
        const profileToLoad = profile || defaultExam;
        setExamProfile(profileToLoad);

        // Get topics from new taxonomy
        const exam = getExam(profileToLoad);
        const topicsForExam = exam?.topics || [];
        const savedTopic = localStorage.getItem('topic');

        // Validate saved topic exists in new taxonomy
        const isTopicValid = topicsForExam.some((t) => t.value === savedTopic);
        const topicToLoad = isTopicValid
            ? savedTopic
            : topicsForExam.length > 0
                ? topicsForExam[0].value
                : '';

        setTopic(topicToLoad);

        // Get subtopics using LABELS (for database matching)
        const currentTopicObject = topicsForExam.find((t) => t.value === topicToLoad);
        const subs = currentTopicObject?.subtopics.map(s => s.label) || [];
        setCurrentSubTopics(subs);

        if (subs.length > 0) {
            setSelectedSubTopic(subs[0]);
        } else {
            setSelectedSubTopic(null);
        }
        setCurrentQuestionIndex(0);
    }, []);

    useEffect(() => {
        questionCacheRef.current = questionCache;
    }, [questionCache]);

    useEffect(() => {
        const savedProfile = localStorage.getItem('examProfile');
        loadProfileSettings(savedProfile);
    }, [loadProfileSettings]);

    const startTimer = () => {
        stopTimer();
        const startTime = Date.now();
        startTimeRef.current = startTime;
        timerRef.current = window.setInterval(() => {
            setTimeTaken(Math.round((Date.now() - startTime) / 1000));
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    useEffect(() => {
        if (currentTopicInfo.subTopic) {
            loadQuestion(currentQuestionIndex);
        }
    }, [currentTopicInfo, currentQuestionIndex, loadQuestion]);

    const handleSubTopicSelect = (subTopic: string) => {
        if (subTopic === selectedSubTopic) return;
        setSelectedSubTopic(subTopic);
        setCurrentQuestionIndex(0);
        setQuestionCache({});
        questionCacheRef.current = {};
    };

    const handleDifficultyChange = (newDifficulty: 'Easy' | 'Medium' | 'Hard') => {
        if (newDifficulty === difficulty) return;
        setDifficulty(newDifficulty);
        setCurrentQuestionIndex(0);
        setQuestionCache({});
        questionCacheRef.current = {};

        // Show toast notification
        const difficultyEmoji = { Easy: '🌱', Medium: '⚡', Hard: '🔥' };
        addToast(
            `${difficultyEmoji[newDifficulty]} Difficulty set to ${newDifficulty}`,
            'info',
            2500
        );
    };

    const targetTime = useMemo(() => {
        if (!questionData || !examProfile) return 0;
        switch (examProfile) {
            case 'jee_main':
                return questionData.timeTargets.jee_main;
            case 'cat':
                return questionData.timeTargets.cat;
            case 'eamcet':
                return questionData.timeTargets.eamcet;
            default:
                return 0;
        }
    }, [questionData, examProfile]);

    const handleAnswerSubmit = async () => {
        if (selectedOption === null || !questionData || !currentQuestionUuid) return;

        stopTimer();

        const isCorrect = selectedOption === questionData.correctOptionIndex;
        const fsmTargetTime = targetTime || 45; // Default 45s if no target
        const isFast = timeTaken <= fsmTargetTime;
        const fsmTag = currentFsmTag || `${selectedSubTopic}-default`;

        setLastAnswerCorrect(isCorrect);
        setLastAnswerFast(isFast);

        // Save attempt and update mastery
        try {
            const result = await saveAttemptAndUpdateMastery({
                questionUuid: currentQuestionUuid,
                fsmTag: fsmTag,
                isCorrect: isCorrect,
                timeMs: timeTaken * 1000,
                targetTimeMs: fsmTargetTime * 1000,
                selectedOptionIndex: selectedOption,
                skipDrill: false,
            });

            setCurrentStreak(result.new_streak);
            log.info(`Mastery updated: streak=${result.new_streak}, level=${result.new_mastery_level}`);
        } catch (error: any) {
            log.error('Save mastery error:', error.message);
        }

        // Branch based on performance
        if (isCorrect && isFast) {
            // Branch A: Success - show toast and auto-advance
            setPracticeState('success-toast');
        } else {
            // Branch B: Intervention - show modal with FSM
            setPracticeState('intervention');
        }
    };

    const handleReflectionSelect = (reflection: string) => {
        setReflectionChoice(reflection);
        setPracticeState('fsm');
    };

    const handlePracticeSimilar = () => {
        setPracticeState('mini-practice');
    };

    const handleAddToQueue = () => {
        // TODO: Implement spaced repetition queue
        alert('Added to your spaced repetition queue!');
        loadQuestion(currentQuestionIndex + 1);
        setCurrentQuestionIndex((prev) => prev + 1);
    };

    const handleSkip = () => {
        loadQuestion(currentQuestionIndex + 1);
        setCurrentQuestionIndex((prev) => prev + 1);
    };

    // Mastery Loop Handlers
    const handleSuccessToastComplete = () => {
        // Auto-advance to next question after success toast
        loadQuestion(currentQuestionIndex + 1);
        setCurrentQuestionIndex((prev) => prev + 1);
    };

    const handleProveIt = async () => {
        // Fetch a new question with the same FSM tag
        const fsmTag = currentFsmTag || `${selectedSubTopic}-default`;

        try {
            setIsLoading(true);
            const similarQuestion = await getQuestionByFsmTag(fsmTag, currentQuestionUuid || undefined);

            if (similarQuestion) {
                setQuestionData(similarQuestion);
                setCurrentQuestionUuid(similarQuestion.uuid);
                setCurrentFsmTag(similarQuestion.fsmTag);
                setSelectedOption(null);
                setTimeTaken(0);
                setPracticeState('question');
                startTimer();
            } else {
                // No similar question found, fall back to normal flow
                log.warn('No similar question found for Prove It, loading next');
                loadQuestion(currentQuestionIndex + 1);
                setCurrentQuestionIndex((prev) => prev + 1);
            }
        } catch (error: any) {
            log.error('Prove It error:', error.message);
            loadQuestion(currentQuestionIndex + 1);
            setCurrentQuestionIndex((prev) => prev + 1);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkipIntervention = async () => {
        // Mark as debt and move to next question
        const fsmTag = currentFsmTag || `${selectedSubTopic}-default`;

        try {
            if (currentQuestionUuid) {
                await saveAttemptAndUpdateMastery({
                    questionUuid: currentQuestionUuid,
                    fsmTag: fsmTag,
                    isCorrect: lastAnswerCorrect,
                    timeMs: timeTaken * 1000,
                    targetTimeMs: (targetTime || 45) * 1000,
                    selectedOptionIndex: selectedOption ?? 0,
                    skipDrill: true, // This marks debt
                });
            }
        } catch (error: any) {
            log.error('Skip intervention error:', error.message);
        }

        loadQuestion(currentQuestionIndex + 1);
        setCurrentQuestionIndex((prev) => prev + 1);
    };

    const handleMiniPracticeComplete = (results: {
        correct: number;
        total: number;
        timeTaken: number;
    }) => {
        setPracticeState('feedback');
    };

    const handleTrainPattern = () => {
        alert('Pattern training feature coming soon!');
    };

    const handleNextAfterFeedback = () => {
        loadQuestion(currentQuestionIndex + 1);
        setCurrentQuestionIndex((prev) => prev + 1);
    };

    if (!examProfile || !topic) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <h3 className="text-lg font-medium">Set Your Preferences</h3>
                    <p className="text-muted-foreground mt-2">
                        Please go to your Profile to select an exam before you start practicing.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const WorkspaceArea = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-card border rounded-xl h-full min-h-[300px]">
                    <svg
                        className="animate-spin h-10 w-10 text-emerald-600 mb-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <p className="font-semibold">Generating Question...</p>
                    <p className="text-sm text-muted-foreground">This may take a few seconds.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-lg text-center">
                    <h4 className="font-bold text-lg mb-2">Generation Failed</h4>
                    <p>{error}</p>
                </div>
            );
        }

        if (!questionData) {
            return <div className="min-h-[300px]" />;
        }

        // Generate mock mini practice questions (in production, these would come from backend)
        const mockMiniQuestions = [
            {
                id: '1',
                text: 'What is 5 + 3?',
                options: ['6', '7', '8', '9'],
                correctIndex: 2,
            },
            {
                id: '2',
                text: 'What is 12 - 4?',
                options: ['6', '7', '8', '9'],
                correctIndex: 2,
            },
            {
                id: '3',
                text: 'What is 3 × 4?',
                options: ['10', '11', '12', '13'],
                correctIndex: 2,
            },
        ];

        return (
            <div className="space-y-6">
                {/* Question Card - Always visible */}
                <QuestionCard
                    data={questionData}
                    isAnswered={practiceState !== 'question'}
                    selectedOption={selectedOption}
                    onOptionChange={practiceState === 'question' ? setSelectedOption : undefined}
                    onAnswerSubmit={handleAnswerSubmit}
                    timeTaken={timeTaken}
                    targetTime={targetTime}
                />

                {/* Reflection Panel */}
                {practiceState === 'reflection' && (
                    <ReflectionPanel onReflectionSelect={handleReflectionSelect} />
                )}

                {/* FSM Panel */}
                {(practiceState === 'fsm' || practiceState === 'reinforce') && questionData.fastestSafeMethod.exists && (
                    <FsmPanel
                        patternTrigger={questionData.fastestSafeMethod.preconditions || 'This question type'}
                        steps={questionData.fastestSafeMethod.steps.map((step) => ({ step }))}
                        safetyChecks={
                            questionData.fastestSafeMethod.sanityCheck
                                ? [questionData.fastestSafeMethod.sanityCheck]
                                : []
                        }
                        whenToUse="Use this method when you need to solve quickly with high accuracy"
                    />
                )}

                {/* Reinforce Menu */}
                {practiceState === 'reinforce' && (
                    <ReinforceMenu
                        onPracticeSimilar={handlePracticeSimilar}
                        onAddToQueue={handleAddToQueue}
                        onSkip={handleSkip}
                    />
                )}

                {/* Mini Practice */}
                {practiceState === 'mini-practice' && (
                    <MiniPractice questions={mockMiniQuestions} onComplete={handleMiniPracticeComplete} />
                )}

                {/* Feedback Summary */}
                {practiceState === 'feedback' && (
                    <>
                        <FeedbackSummary
                            timeSaved={targetTime - timeTaken}
                            accuracy={67}
                            errorCategory={selectedOption === questionData.correctOptionIndex ? null : 'method'}
                            baselineTime={targetTime}
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleNextAfterFeedback}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                            >
                                Continue Practice →
                            </button>
                        </div>
                    </>
                )}

                {/* Show Reinforce Menu after FSM is shown */}
                {practiceState === 'fsm' && (
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={() => setPracticeState('reinforce')}
                            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                        >
                            Continue →
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Top Navigation Bar - Single row on desktop */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b">
                {/* Left: Topic & Subtopic */}
                <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Topic:
                        </label>
                        <Select
                            value={topic || ''}
                            onChange={(e) => {
                                const newTopic = e.target.value;
                                setTopic(newTopic);
                                localStorage.setItem('topic', newTopic);
                                const topicDef = getTopic(examProfile || '', newTopic);
                                const subs = topicDef?.subtopics.map(s => s.label) || [];
                                setCurrentSubTopics(subs);
                                if (subs.length > 0) {
                                    setSelectedSubTopic(subs[0]);
                                }
                                setCurrentQuestionIndex(0);
                                setQuestionCache({});
                                questionCacheRef.current = {};
                            }}
                            options={getTopicOptions(examProfile || '').map(t => ({
                                value: t.value,
                                label: t.label
                            }))}
                            className="min-w-[180px]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Sub-topic:
                        </label>
                        <Select
                            value={selectedSubTopic || ''}
                            onChange={(e) => handleSubTopicSelect(e.target.value)}
                            options={currentSubTopics.map((sub) => ({ value: sub, label: sub }))}
                            className="min-w-[200px]"
                        />
                    </div>
                </div>

                {/* Right: Question Number & Difficulty */}
                <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
                    <p className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                        Question {currentQuestionIndex + 1}
                    </p>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Difficulty:
                        </label>
                        <Select
                            options={[
                                { value: 'Easy', label: 'Easy' },
                                { value: 'Medium', label: 'Medium' },
                                { value: 'Hard', label: 'Hard' },
                            ]}
                            value={difficulty}
                            onChange={(e) => handleDifficultyChange(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                            className="w-28"
                        />
                    </div>
                </div>
            </div>

            {/* Question Workspace Area - Full Width */}
            <WorkspaceArea />

            {/* Prescription Chip - only show after feedback */}
            {practiceState === 'feedback' && questionData && selectedSubTopic && (
                <PrescriptionChip
                    patternName={selectedSubTopic}
                    onTrainPattern={handleTrainPattern}
                />
            )}

            {/* Success Toast - Fixed position overlay */}
            {practiceState === 'success-toast' && (
                <SuccessToast
                    onComplete={handleSuccessToastComplete}
                    timeSaved={targetTime - timeTaken}
                />
            )}

            {/* Intervention Modal - Fixed position overlay */}
            {practiceState === 'intervention' && questionData && (
                <InterventionModal
                    questionData={questionData}
                    isCorrect={lastAnswerCorrect}
                    isFast={lastAnswerFast}
                    timeTaken={timeTaken}
                    targetTime={targetTime || 45}
                    onProveIt={handleProveIt}
                    onSkip={handleSkipIntervention}
                />
            )}

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
};
