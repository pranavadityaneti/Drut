import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@drut/shared';
import { PracticeSetup } from './PracticeSetup';
import { QuestionData } from '@drut/shared';
import { getQuestionsForUser, getReviewQuestionsForUser, isServableQuestion, triggerDiagramGeneration, DIFFICULTY_SELECTION_ENABLED, resolveTargetSeconds } from '@drut/shared';
import { authService } from '@drut/shared';
const { getCurrentUser } = authService;
import { getPreloadedQuestion } from '@drut/shared'; // from ../../services/preloaderService';
import { isValidOscillationQuestion } from '../../lib/clientValidator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { LatexText } from '../ui/LatexText';
import { Badge } from '../ui/badge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { QuestionCard } from '../QuestionCard';
import { EXAM_TAXONOMY, getExam, getTopic, getExamOptions, getTopicOptions, getSubtopicOptions } from '@drut/shared'; // from ../../lib/taxonomy';
import { log } from '@drut/shared'; // from ../../lib/log';
// @ts-ignore
import { supabase } from '@drut/shared'; // from ../../services/performanceService';
import { saveAttemptAndUpdateMastery, getQuestionByFsmTag } from '@drut/shared'; // from ../../services/performanceService';
import { isPaywallError, useRazorpayCheckout, isFirstTimerSubscriber } from '@drut/shared';
import type { PlanId } from '@drut/shared';
import { PaywallModal } from '../PaywallModal';
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

    // Dynamic Topics State
    const [dynamicTopics, setDynamicTopics] = useState<any[]>([]);

    // Get topic LABEL from taxonomy (for database matching)
    const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null); // This is now always a VALUE
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [classLevel, setClassLevel] = useState<string | null>(null);
    const [board, setBoard] = useState<string | null>(null);
    const [subject, setSubject] = useState<string | null>(null);

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
        classLevel?: string;
        board?: string;
        subject?: string;
        // Matches the `language?` parameter on getQuestionsForUser in
        // packages/shared/src/services/questionCacheService.ts. The runtime
        // code already reads setupConfig.language (line ~326); this field
        // closes the type gap.
        language?: 'English' | 'Telugu' | 'Hindi';
    } | null>(null);

    // Mastery Loop state
    const [currentQuestionUuid, setCurrentQuestionUuid] = useState<string | null>(null);
    const [currentFsmTag, setCurrentFsmTag] = useState<string | null>(null);
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean>(false);
    const [lastAnswerFast, setLastAnswerFast] = useState<boolean>(false);
    const [currentStreak, setCurrentStreak] = useState<number>(0);

    // Toast notifications
    const { toasts, addToast, dismissToast } = useToast();

    // Paywall (free-tier 20/day gate)
    const [showPaywall, setShowPaywall] = useState<boolean>(false);
    const [paywallReason, setPaywallReason] = useState<string | undefined>(undefined);
    const [isFirstTimer, setIsFirstTimer] = useState<boolean>(true);
    const { pay: payWithRazorpay, busy: checkoutBusy } = useRazorpayCheckout({ name: 'Drut' });

    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null); // Action 3: Precision Timer
    const fetchingRef = useRef<boolean>(false);
    const questionCacheRef = useRef<{ [key: string]: QuestionData[] }>({});
    const currentRequestId = useRef<string | null>(null); // Action 2: Taxonomy Race Condition

    // Get topic LABEL from taxonomy (for database matching)
    const topicLabel = useMemo(() => {
        if (!examProfile || !topic) return null;
        if (topic === 'all') return 'All Chapters';
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
                // "All Chapters" → 'ALL' (serving RPC's any-topic sentinel); the subject
                // filter scopes results. Passing the subject AS the topic matched nothing
                // (stored topics are chapter names, never the subject).
                const apiTopic = (currentTopic === 'All Chapters' || topic === 'all') ? 'ALL' : currentTopic;
                const { questions } = await getQuestionsForUser(
                    user.id,
                    examProfile,
                    apiTopic,
                    currentSubTopic,
                    batchSize,
                    difficulty,
                    classLevel || undefined,
                    board || undefined,
                    subject || undefined
                );

                // FILTER: the shared serving gate (new-format + approved source) —
                // identical on web and mobile so both platforms serve the same pool.
                // Wrapped here with the session's domain guard. Defined as a predicate
                // so the review-seen fallback below applies the EXACT same gate.
                const isTrusted = (q: any) =>
                    isServableQuestion(q) &&
                    // CRITICAL: Strict Domain Guard — don't serve Physics in a Math session
                    (!q.metadata || !subject || (q.metadata.subject && q.metadata.subject.toLowerCase() === subject.toLowerCase()));

                const validQuestions = questions.filter(isTrusted);

                if (validQuestions.length < questions.length) {
                    log.warn(`[cache] Discarded ${questions.length - validQuestions.length} stale/unverified questions.`);
                }

                // If shortfall, fall back to VERIFIED REVIEW questions (already-seen,
                // real DB rows for this exact filter) — NEVER live-generate. This
                // replaces the old client-side force-generation, which produced
                // old-format, un-audited questions stamped with non-UUID `temp-gen`
                // ids (those also broke save-mastery). Quality stays gated; the same
                // `isTrusted` predicate is applied to review candidates.
                if (validQuestions.length < batchSize) {
                    const deficit = batchSize - validQuestions.length;
                    try {
                        const { questions: reviewQs } = await getReviewQuestionsForUser(
                            examProfile,
                            currentTopic,
                            currentSubTopic,
                            deficit,
                            difficulty,
                            subject || undefined
                        );
                        const alreadyHave = new Set(validQuestions.map((q: any) => q.uuid));
                        const reviewFill = reviewQs
                            .filter(isTrusted)
                            .filter((q: any) => !alreadyHave.has(q.uuid))
                            .slice(0, deficit);
                        if (reviewFill.length > 0) {
                            log.info(`[cache] Filled ${reviewFill.length} from verified review pool (no live-gen).`);
                            validQuestions.push(...reviewFill);
                        } else {
                            log.info(`[cache] No verified review questions available for this filter.`);
                        }
                    } catch (reviewErr) {
                        console.error("Review fallback failed", reviewErr);
                    }
                }

                if (validQuestions.length > 0) {
                    log.info(
                        `[cache] Loaded ${validQuestions.length} strict questions`
                    );

                    // Trigger diagram generation for questions that need it
                    const questionsWithDiagrams = await triggerDiagramGeneration(validQuestions as QuestionData[]);

                    // Prefetch diagram images for faster rendering
                    const diagramUrls = questionsWithDiagrams
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
                        newCache[currentSubTopic] = [...existing, ...(questionsWithDiagrams as QuestionData[])];
                        questionCacheRef.current = newCache;
                        return newCache;
                    });
                }
            } catch (err: any) {
                // Free-tier gate hit during BACKGROUND prefetch — don't pop the modal
                // mid-question. Stay silent; it resurfaces when the user advances to an
                // unbuffered question (foreground loadQuestion catch shows the paywall).
                if (isPaywallError(err)) {
                    log.info('[paywall] free quota reached on prefetch; will surface on advance');
                    return;
                }
                log.error(`Buffer fetch failed:`, err.message);

                if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
                    setError(
                        'API quota limit reached. Showing questions from cache. New questions will be available soon.'
                    );
                }
            } finally {
                fetchingRef.current = false;
            }
        },
        [currentTopicInfo, examProfile, difficulty, subject]
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
            if (!currentSubTopic || !currentTopic || !examProfile) {
                log.warn('[loadQuestion] Missing context:', { currentSubTopic, currentTopic, examProfile });
                return;
            }

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

                // "All Chapters" → 'ALL' (serving RPC's any-topic sentinel); the subject
                // filter scopes results to the chosen subject. (Passing the subject AS the
                // topic matched nothing — stored topics are chapter names.)
                const apiTopic = (currentTopic === 'All Chapters' || topic === 'all')
                    ? 'ALL'
                    : currentTopic;

                const { questions } = await getQuestionsForUser(
                    user.id,
                    examProfile,
                    apiTopic,
                    currentSubTopic,
                    1,
                    difficulty,
                    classLevel || undefined,
                    board || undefined,
                    subject || undefined,
                    setupConfig.language || 'English' // Pass Language
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

                // 5. Client-Side Strict Validation (Universal Gate) (v3.0)
                // Replaces the old Oscillations-only check with a generic Physics Rules Engine.
                // This blocks invalid questions for ANY topic defined in physicsRules.ts.
                const { isValidQuestionForTopic } = await import('../../lib/clientValidator');

                // Normalize topic for validation (remove /mixed suffix if present)
                const cleanTopic = currentTopic.split('/')[0].trim();
                const validationTopic = cleanTopic === 'Oscillations' ? 'Oscillations' : cleanTopic; // Ensure exact match for known sensitive topic

                if (!isValidQuestionForTopic(validationTopic, data.questionText)) {
                    console.warn(`[LoadQuestion] Rejected by Universal Guardrail: Topic '${validationTopic}'`);

                    // Recursive Retry
                    setIsLoading(true); // User Feedback: Show spinner while retrying
                    // Add delay to prevent tight loop
                    await new Promise(r => setTimeout(r, 1000));
                    return loadQuestion(index);
                }
                // ----------------------------------

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

                // Free-tier daily quota reached → show the upgrade modal, not an error.
                if (isPaywallError(err)) {
                    setPaywallReason(err.reason);
                    setShowPaywall(true);
                    isFirstTimerSubscriber().then(setIsFirstTimer).catch(() => { });
                    setIsLoading(false);
                    return;
                }

                if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
                    setError(
                        "API quota limit reached. We're showing you questions from cache. New questions will be available soon."
                    );
                } else {
                    setError(err.message || 'An unknown error occurred.');
                }
            } finally {
                // Always turn off loading - this was our request at start
                setIsLoading(false);
            }
        },
        [currentTopicInfo, questionCache, ensureQuestionBuffer, examProfile, difficulty, subject]
    );

    useEffect(() => {
        if (!setupConfig) return;
        const config = setupConfig;

        setExamProfile(config.examProfile);
        setDifficulty(config.difficulty);
        setClassLevel(config.classLevel || '11');
        setBoard(config.board || 'CBSE');

        // ensure subject is set
        if (config.subject) setSubject(config.subject);

        log.info('[NewPractice] Session Configured:', config);

        // Fetch Dynamic Topics for this Exam/Subject
        const fetchDynamic = async () => {
            if (config.examProfile.includes('eapcet')) {
                const { data } = await supabase
                    .from('knowledge_nodes')
                    .select('name, metadata')
                    .eq('node_type', 'topic')
                    .eq('metadata->>subject', config.subject); // Filter by subject

                if (data) {
                    setDynamicTopics(data.map((d: any) => ({
                        label: d.name,
                        value: d.name,
                        subject: d.metadata.subject,
                        class_level: d.metadata.class_level || '11'
                    })));
                }
            }
        };
        fetchDynamic();

        // --- FORCE CHAPTER-ONLY MODE ---
        // We ignore subtopics entirely. Every chapter defaults to "Mixed Practice".
        // This prevents old subtopics from 'ghosting' in the UI.
        const subs = [{ value: 'mixed', label: 'Mixed Practice' }];
        setCurrentSubTopics(subs);
        setSelectedSubTopic('mixed');

        // Set topic state (even if 'all')
        setTopic(config.topic);

        setCurrentQuestionIndex(0);
    }, [setupConfig]);

    useEffect(() => {
        questionCacheRef.current = questionCache;
    }, [questionCache]);

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
        addToast(
            `Difficulty set to ${newDifficulty}`,
            'info',
            2500
        );
    };

    const targetTime = useMemo(() => {
        if (!questionData || !examProfile) return 0;
        // Single shared resolver: question's per-exam timeTargets (alias-mapped for
        // EAPCET) → exam/difficulty baseline. Replaces the old 3-exam switch that
        // returned 0 for EAPCET (the MVP exam) and fell back to a flat 45s, diverging
        // from mobile. Now web + mobile compute identical target times.
        return resolveTargetSeconds(
            questionData,
            examProfile,
            (questionData.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium',
        );
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
            // 🛑 TRAP THE GHOST QUESTION ERROR (User Request Loop 2289)
            // If it fails with Foreign Key Constraint (Ghost Question), fail silently but allow UI to proceed.
            if (error.message?.includes('foreign key constraint') || error.code === '23503' || error.message?.includes('409')) {
                log.warn("Could not save mastery for Ghost Question (Client-side generated). Continuing...");
                // Simulate success for local streak if needed (optional)
                setCurrentStreak(prev => prev + (isCorrect ? 1 : 0));

                // Allow execution to proceed to UI Feedback below
            } else {
                log.error('Save mastery error:', error.message);
            }
        }

        // Always proceed to UI feedback loop
        // Branch based on performance
        if (isCorrect && isFast) {
            // Branch A: Success - show toast and auto-advance
            setPracticeState('success-toast');
            setIsProcessing(false);
        } else {
            // Branch B: Intervention - show modal with FSM
            setPracticeState('intervention');
            setIsProcessing(false);
        }
    };

    const handleReflectionSelect = (reflection: string) => {
        setReflectionChoice(reflection);
        setPracticeState('fsm');
    };

    // "Practice Similar" serves a REAL same-pattern question (via the Prove It / FSM-tag
    // fetch) — no mock drill. Shows a toast if no variant exists for the pattern yet.
    const handlePracticeSimilar = () => {
        handleProveIt();
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
            // Free-tier daily quota reached on the drill → show the upgrade modal.
            if (isPaywallError(error)) {
                setPaywallReason(error.reason);
                setShowPaywall(true);
                isFirstTimerSubscriber().then(setIsFirstTimer).catch(() => { });
                setIsLoading(false);
                return;
            }
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

    // Paywall → Razorpay checkout. On verified payment the subscription is active
    // server-side; resume by reloading the current question (the gate now passes).
    const handleUpgrade = async (plan: PlanId, couponCode?: string) => {
        try {
            await payWithRazorpay(plan, couponCode);
            setShowPaywall(false);
            setError(null);
            addToast("You're now Drut Pro — practice on!", 'success', 3000);
            loadQuestion(currentQuestionIndex);
        } catch (e: any) {
            // User closed the sheet or a checkout is already open — keep the modal, no error.
            if (e?.message === 'checkout-dismissed' || e?.message === 'checkout-already-open') return;
            addToast(e?.message || 'Payment could not be completed. Please try again.', 'warning', 4000);
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
        return (
            <div className="flex items-center justify-center gap-3 p-10 text-[var(--color-ink-3)] text-[14px]">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-[var(--color-ink-5)] border-t-[var(--color-ink-1)] animate-spin" />
                Loading session…
            </div>
        );
    }

    const WorkspaceArea = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-card ring-hairline rounded-[1.25rem] h-full min-h-[300px]">
                    <span
                        className="inline-block h-10 w-10 mb-4 rounded-full border-[3px] border-[var(--color-ink-5)] border-t-[var(--color-primary-deep)] animate-spin"
                        aria-hidden
                    />
                    <p className="label-uppercase">Generating</p>
                    <p className="text-[16px] font-semibold tracking-tight text-[var(--color-ink-1)] mt-1">Question incoming</p>
                    <p className="text-[12px] text-[var(--color-ink-3)] mt-2">This may take a few seconds.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="relative p-6 bg-[var(--color-muted)] ring-hairline-strong rounded-[14px] overflow-hidden">
                    <span
                        aria-hidden
                        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-[var(--color-destructive)]"
                    />
                    <p className="label-uppercase text-[var(--color-destructive)]">Generation failed</p>
                    <p className="text-[14px] text-[var(--color-ink-1)] mt-1.5 leading-relaxed">{error}</p>
                </div>
            );
        }

        if (!questionData) {
            return <div className="min-h-[300px]" />;
        }

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

                {/* The Optimal Path Panel — LEGACY format only. Render ONLY when the
                    question has no new-format Quick Method, so new format always wins
                    (enriched PYQs carry both; old labels must never show for them). */}
                {(practiceState === 'fsm' || practiceState === 'reinforce') && !(questionData.quickMethod?.steps?.length) && questionData.theOptimalPath?.exists && (
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

                {/* Quick Method (new "B+C mix" format — clean 3 steps, no framework labels) */}
                {(practiceState === 'fsm' || practiceState === 'reinforce') && (questionData.quickMethod?.steps?.length ?? 0) > 0 && (
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-6 space-y-3">
                            <h3 className="text-lg font-semibold text-[#3d7a0f]">Quick Method</h3>
                            <ol className="space-y-3">
                                {questionData.quickMethod?.steps.map((step, index) => (
                                    <li key={index} className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3d7a0f] text-white text-xs font-medium flex items-center justify-center">
                                            {index + 1}
                                        </span>
                                        <div className="flex-1 pt-0.5 text-sm text-foreground">
                                            <LatexText text={step} />
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                )}

                {/* Reinforce Menu */}
                {practiceState === 'reinforce' && (
                    <ReinforceMenu
                        onPracticeSimilar={handlePracticeSimilar}
                        onAddToQueue={handleAddToQueue}
                        onSkip={handleSkip}
                    />
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
                                className="px-5 h-10 inline-flex items-center justify-center gap-2 bg-[var(--color-primary-deep)] text-white rounded-[8px] text-[14px] font-semibold tracking-tight hover:opacity-90 transition-opacity"
                            >
                                Continue practice
                                <span aria-hidden>→</span>
                            </button>
                        </div>
                    </>
                )}

                {/* Show Reinforce Menu after FSM is shown */}
                {practiceState === 'fsm' && (
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={() => setPracticeState('reinforce')}
                            className="px-5 h-10 inline-flex items-center justify-center gap-2 bg-[var(--color-primary-deep)] text-white rounded-[8px] text-[14px] font-semibold tracking-tight hover:opacity-90 transition-opacity"
                        >
                            Continue
                            <span aria-hidden>→</span>
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
            <div className="flex flex-wrap justify-between items-center gap-x-8 gap-y-3 pb-4 border-b border-[var(--color-ink-5)]">
                {/* Left: Topic & Subtopic */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-[var(--color-ink-3)]">
                            Topic:
                        </span>
                        <Select
                            value={topic || ''}
                            onChange={(e) => {
                                const newTopic = e.target.value;
                                setTopic(newTopic);
                                localStorage.setItem('topic', newTopic);

                                if (newTopic === 'all') {
                                    setCurrentSubTopics([{ value: 'mixed', label: 'Mixed Practice' }]);
                                    setSelectedSubTopic('mixed');
                                } else {
                                    const topicDef = getTopic(examProfile || '', newTopic);
                                    const subs = topicDef?.subtopics.map(s => ({ value: s.value, label: s.label })) || [];
                                    setCurrentSubTopics(subs);
                                    if (subs.length > 0) {
                                        setSelectedSubTopic(subs[0].value); // Use value, not label
                                    }
                                }
                                setCurrentQuestionIndex(0);
                                setQuestionCache({});
                                questionCacheRef.current = {};
                            }}
                            options={(() => {
                                const uniqueOptions = new Map();
                                uniqueOptions.set('all', { value: 'all', label: 'Select All Chapters' });

                                // Static Topics
                                getTopicOptions(examProfile || '').forEach(t => uniqueOptions.set(t.value, { value: t.value, label: t.label }));

                                // Dynamic Topics
                                dynamicTopics.forEach(t => uniqueOptions.set(t.value, { value: t.value, label: t.label }));

                                // Optimistic (if topic selected but not in list yet)
                                if (topic && topic !== 'all' && !uniqueOptions.has(topic)) {
                                    uniqueOptions.set(topic, { value: topic, label: topic });
                                }

                                return Array.from(uniqueOptions.values());
                            })()}
                        />
                    </div>
                    {/* Hide Sub-topic if not applicable (e.g. Dynamic Topic or Select All) */}
                    {/* SUBTOPIC DROPDOWN REMOVED (Chapter-Only Mode) */}
                </div>

                {/* Right: Question Number & Difficulty */}
                <div className="flex items-center gap-4">
                    <span className="text-[13px] font-semibold text-[var(--color-ink-2)] num-tabular">
                        Question {currentQuestionIndex + 1}
                    </span>
                    {/* In-session difficulty selector — hidden until difficulty is empirically calibrated (Elo). */}
                    {DIFFICULTY_SELECTION_ENABLED && (
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-[var(--color-ink-3)]">
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
                    )}
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

            {/* Free-tier paywall (20 questions/day) */}
            <PaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                onUpgrade={handleUpgrade}
                isFirstTimer={isFirstTimer}
                loading={checkoutBusy}
                reason={paywallReason}
            />
        </div>
    );
};
