import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@drut/shared';
import { PracticeSetup } from './PracticeSetup';
import { QuestionData } from '@drut/shared';
import { getQuestionsForUser } from '@drut/shared'; // from ../../services/questionCacheService';
import { authService } from '@drut/shared';
const { getCurrentUser } = authService;
import { getPreloadedQuestion } from '@drut/shared'; // from ../../services/preloaderService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { QuestionCard } from '../QuestionCard';
import { EXAM_TAXONOMY, getExam, getTopic, getExamOptions, getTopicOptions, getSubtopicOptions } from '@drut/shared'; // from ../../lib/taxonomy';
import { log } from '@drut/shared'; // from ../../lib/log';
import { saveAttemptAndUpdateMastery, getQuestionByFsmTag } from '@drut/shared'; // from ../../services/performanceService';
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
    const [currentSubTopics, setCurrentSubTopics] = useState<Array<{ value: string, label: string }>>([]);
    const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null); // This is now always a VALUE
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

    const [questionCache, setQuestionCache] = useState<{ [key: string]: QuestionData[] }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false); // Action 1: Rage Click Guard
    const [error, setError] = useState<string | null>(null);

    const [questionData, setQuestionData] = useState<QuestionData | null>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [timeTaken, setTimeTaken] = useState<number>(0);
    const [reflectionChoice, setReflectionChoice] = useState<string | null>(null);

    const [practiceState, setPracticeState] = useState<PracticeState>('question');
    const [setupConfig, setSetupConfig] = useState<{
        examProfile: string;
        topic: string;
        subtopic: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
    } | null>(null);

    // Mastery Loop state
    const [currentQuestionUuid, setCurrentQuestionUuid] = useState<string | null>(null);
    const [currentFsmTag, setCurrentFsmTag] = useState<string | null>(null);
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean>(false);
    const [lastAnswerFast, setLastAnswerFast] = useState<boolean>(false);
    const [currentStreak, setCurrentStreak] = useState<number>(0);

    // Toast notifications
    const { toasts, addToast, dismissToast } = useToast();

    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null); // Action 3: Precision Timer
    const fetchingRef = useRef<boolean>(false);
    const questionCacheRef = useRef<{ [key: string]: QuestionData[] }>({});
    const currentRequestId = useRef<string | null>(null); // Action 2: Taxonomy Race Condition

    // Get topic LABEL from taxonomy (for database matching)
    const topicLabel = useMemo(() => {
        if (!examProfile || !topic) return null;
        const topicDef = getTopic(examProfile, topic);
        return topicDef?.label || topic;
    }, [examProfile, topic]);

    const currentTopicInfo = useMemo(() => {
        // Use subtopic VALUE for API calls (not label)
        // Get the label for display purposes
        const subtopicDef = currentSubTopics.find(s => s.value === selectedSubTopic);
        return {
            topic: topicLabel,
            subTopic: selectedSubTopic,  // API uses value
            subTopicLabel: subtopicDef?.label || selectedSubTopic  // Display uses label
        };
    }, [topicLabel, selectedSubTopic, currentSubTopics]);

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

                    // Prefetch diagram images for faster rendering
                    const diagramUrls = questions
                        .map(q => (q as any).diagramUrl)
                        .filter((url): url is string => !!url);

                    if (diagramUrls.length > 0) {
                        log.info(`[prefetch] Preloading ${diagramUrls.length} diagram images`);
                        diagramUrls.forEach(url => {
                            const img = new Image();
                            img.src = url;
                        });
                    }

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
            // Action 2: Generate Request ID
            const requestId = Math.random().toString(36).substring(7);
            currentRequestId.current = requestId;

            setQuestionData(null);
            setSelectedOption(null);
            setTimeTaken(0);
            setReflectionChoice(null);
            setPracticeState('question');
            setIsProcessing(false); // Reset processing state
            stopTimer();

            const { subTopic: currentSubTopic, topic: currentTopic } = currentTopicInfo;
            if (!currentSubTopic || !currentTopic || !examProfile) return;

            log.info(`[loadQuestion] Loading question for ${currentTopic}/${currentSubTopic} (request: ${requestId})`);

            ensureQuestionBuffer(index);

            if (index === 0) {
                const preloaded = getPreloadedQuestion(examProfile, currentTopic, currentSubTopic);
                if (preloaded) {
                    // Check for race condition before applying state
                    if (currentRequestId.current !== requestId) {
                        log.warn(`[loadQuestion] Stale request ${requestId}, ignoring preloaded`);
                        return;
                    }

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

                // Check for race condition
                if (currentRequestId.current !== requestId) {
                    log.warn(`[loadQuestion] Stale request ${requestId}, ignoring cached`);
                    return;
                }

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

                log.info(`[loadQuestion] Fetching from API for ${currentTopic}/${currentSubTopic}`);
                const { questions } = await getQuestionsForUser(
                    user.id,
                    examProfile,
                    currentTopic,
                    currentSubTopic,
                    1,
                    difficulty
                );

                // Check for race condition after async call
                if (currentRequestId.current !== requestId) {
                    log.warn(`[loadQuestion] Stale request ${requestId} after API call, ignoring`);
                    // Still need to turn off loading for this stale request path
                    setIsLoading(false);
                    return;
                }

                if (questions.length === 0) {
                    throw new Error('No questions available. Please try again later.');
                }

                const data = questions[0];
                log.info(`[loadQuestion] Received question: ${data.questionText?.substring(0, 50)}...`);
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
                // Log error but still handle loading state
                log.error(`[loadQuestion] Error: ${err.message}`);

                if (currentRequestId.current !== requestId) {
                    setIsLoading(false);
                    return;
                }

                if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
                    setError(
                        "⚠️ API quota limit reached. We're showing you questions from cache. New questions will be available soon."
                    );
                } else {
                    setError(err.message || 'An unknown error occurred.');
                }
            } finally {
                // Always turn off loading - this was our request at start
                setIsLoading(false);
            }
        },
        [currentTopicInfo, questionCache, ensureQuestionBuffer, examProfile, difficulty]
    );

    const loadProfileSettings = useCallback((config: typeof setupConfig) => {
        if (!config) return;

        setExamProfile(config.examProfile);
        setTopic(config.topic);
        setSelectedSubTopic(config.subtopic); // This is a VALUE like 'free-body-diagrams'
        setDifficulty(config.difficulty);

        // Load sibling subtopics for the dropdown (store both value and label)
        const topicDef = getTopic(config.examProfile, config.topic);
        const subs = topicDef?.subtopics.map(s => ({ value: s.value, label: s.label })) || [];
        setCurrentSubTopics(subs);

        setCurrentQuestionIndex(0);
    }, []);

    useEffect(() => {
        questionCacheRef.current = questionCache;
    }, [questionCache]);

    useEffect(() => {
        if (setupConfig) {
            loadProfileSettings(setupConfig);
        }
    }, [setupConfig, loadProfileSettings]);

    const startTimer = () => {
        stopTimer();
        const startTime = Date.now();
        startTimeRef.current = startTime;
        // Update UI timer
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

    const handleSubTopicSelect = (subTopicValue: string) => {
        if (subTopicValue === selectedSubTopic) return;
        setSelectedSubTopic(subTopicValue);
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
        // Action 1: Rage Click Guard
        if (isProcessing) return;
        if (selectedOption === null || !questionData || !currentQuestionUuid) return;

        setIsProcessing(true);
        stopTimer();

        // Action 3: Precise Timer Calculation
        const endTime = Date.now();
        const startTime = startTimeRef.current || endTime;
        const preciseTimeMs = endTime - startTime;
        const preciseTimeSec = preciseTimeMs / 1000;

        // Update state with precise time for UI
        setTimeTaken(Math.round(preciseTimeSec));

        const isCorrect = selectedOption === questionData.correctOptionIndex;
        const fsmTargetTime = targetTime || 45; // Default 45s if no target
        const isFast = preciseTimeSec <= fsmTargetTime;
        const fsmTag = currentFsmTag || `${selectedSubTopic}-default`;

        setLastAnswerCorrect(isCorrect);
        setLastAnswerFast(isFast);

        // Save attempt and update mastery
        try {
            const result = await saveAttemptAndUpdateMastery({
                questionUuid: currentQuestionUuid,
                fsmTag: fsmTag,
                isCorrect: isCorrect,
                timeMs: preciseTimeMs, // Send precise ms
                targetTimeMs: fsmTargetTime * 1000,
                selectedOptionIndex: selectedOption,
                skipDrill: false,
            });

            setCurrentStreak(result.new_streak);
            log.info(`Mastery updated: streak=${result.new_streak}, level=${result.new_mastery_level}`);
        } catch (error: any) {
            log.error('Save mastery error:', error.message);
        } finally {
            // Branch based on performance
            if (isCorrect && isFast) {
                // Branch A: Success - show toast and auto-advance
                setPracticeState('success-toast');
                setIsProcessing(false); // Enable for next interactions
            } else {
                // Branch B: Intervention - show modal with FSM
                setPracticeState('intervention');
                setIsProcessing(false); // Enable inputs within modal if any (or waiting for Prove It)
            }
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
                // Action 4: Handle Empty State specifically
                log.warn('No similar question found for Prove It');
                addToast(
                    "No drill variants available for this pattern yet.",
                    "warning",
                    3000
                );
                // Do NOT advance significantly, just stay or maybe close modal?
                // User requirement: "Do not transition state. Keep them on the Intervention Modal..."
                setIsLoading(false);
                return;
            }
        } catch (error: any) {
            log.error('Prove It error:', error.message);
            // Fallback: If error, notify user but don't crash
            addToast(
                "Failed to load drill question. Please try again.",
                "warning",
                3000
            );
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

    if (!setupConfig) {
        return <PracticeSetup onStart={setSetupConfig} />;
    }

    if (!examProfile || !topic) {
        return <div className="flex justify-center p-10"><span className="loading loading-spinner"></span> Loading session...</div>;
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
                    isDisabled={isProcessing} // Action 1: UI Block
                />

                {/* Reflection Panel */}
                {practiceState === 'reflection' && (
                    <ReflectionPanel onReflectionSelect={handleReflectionSelect} />
                )}

                {/* The Optimal Path Panel */}
                {(practiceState === 'fsm' || practiceState === 'reinforce') && questionData.theOptimalPath.exists && (
                    <FsmPanel
                        patternTrigger={questionData.theOptimalPath.preconditions || 'This question type'}
                        steps={questionData.theOptimalPath.steps.map((step) => ({ step }))}
                        safetyChecks={
                            questionData.theOptimalPath.sanityCheck
                                ? [questionData.theOptimalPath.sanityCheck]
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

                {/* Intervention Panel - Inline below question */}
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
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Top Navigation Bar - Always flex-row, wraps on small screens */}
            <div className="flex flex-wrap justify-between items-center gap-x-8 gap-y-3 pb-4 border-b">
                {/* Left: Topic & Subtopic */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                            Topic:
                        </span>
                        <Select
                            value={topic || ''}
                            onChange={(e) => {
                                const newTopic = e.target.value;
                                setTopic(newTopic);
                                localStorage.setItem('topic', newTopic);
                                const topicDef = getTopic(examProfile || '', newTopic);
                                const subs = topicDef?.subtopics.map(s => ({ value: s.value, label: s.label })) || [];
                                setCurrentSubTopics(subs);
                                if (subs.length > 0) {
                                    setSelectedSubTopic(subs[0].value); // Use value, not label
                                }
                                setCurrentQuestionIndex(0);
                                setQuestionCache({});
                                questionCacheRef.current = {};
                            }}
                            options={getTopicOptions(examProfile || '').map(t => ({
                                value: t.value,
                                label: t.label
                            }))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Sub-topic:
                        </span>
                        <Select
                            value={selectedSubTopic || ''}
                            onChange={(e) => handleSubTopicSelect(e.target.value)}
                            options={currentSubTopics.map((sub) => ({ value: sub.value, label: sub.label }))}
                        />
                    </div>
                </div>

                {/* Right: Question Number & Difficulty */}
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground font-medium">
                        Question {currentQuestionIndex + 1}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                            Difficulty:
                        </span>
                        <Select
                            options={[
                                { value: 'Easy', label: 'Easy' },
                                { value: 'Medium', label: 'Medium' },
                                { value: 'Hard', label: 'Hard' },
                            ]}
                            value={difficulty}
                            onChange={(e) => handleDifficultyChange(e.target.value as 'Easy' | 'Medium' | 'Hard')}
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



            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
};
