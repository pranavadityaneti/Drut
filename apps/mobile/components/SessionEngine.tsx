import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../constants/Colors';
import { SessionHeader } from './SessionHeader';
import { QuestionCard } from './QuestionCard';
import { SessionSummary } from './SessionSummary';
import { useRouter } from 'expo-router';
import { authService, saveAttemptAndUpdateMastery, resolveTargetSeconds, isFirstTimerSubscriber } from '@drut/shared';
import type { PlanId } from '@drut/shared';
import { usePracticeQuestions } from '../hooks/usePracticeQuestions';
import { InterventionModal } from './practice/InterventionModal';
import { PaywallModal } from './PaywallModal';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';
import { ChevronRight } from 'lucide-react-native';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface SessionEngineProps {
    config: {
        exam: string;
        subject: string;
        chapters?: string[];
        difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
        questionCount?: number;
        mode?: 'practice' | 'sprint';
    };
    onSessionComplete?: (results: any) => void;
}

export const SessionEngine: React.FC<SessionEngineProps> = ({ config, onSessionComplete }) => {
    const router = useRouter();
    const questionCount = config.questionCount || 10;

    // Questions
    const { questions, loading, loadingMore, error, paywall, loadMore, retryAfterUpgrade, totalTarget } = usePracticeQuestions({
        config,
        batchSize: Math.min(5, questionCount),
    });

    // Paywall (free-tier 20/day gate) → Razorpay WebView checkout
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
    const [checkoutCoupon, setCheckoutCoupon] = useState<string | null>(null);
    const [isFirstTimer, setIsFirstTimer] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Results & Summary
    const [results, setResults] = useState<any[]>([]);
    const [showSummary, setShowSummary] = useState(false);

    // Timer
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [sessionTime, setSessionTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startQuestionTimeRef = useRef<number>(0);
    const startSessionTimeRef = useRef<number>(0);

    // Intervention
    const [showIntervention, setShowIntervention] = useState(false);

    // Success toast (correct answer — show Next button)
    const [showCorrectNext, setShowCorrectNext] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Start timer when questions load
    useEffect(() => {
        if (!loading && questions.length > 0) {
            startTimer();
        }
        return () => stopTimer();
    }, [loading]);

    // Error handling
    useEffect(() => {
        if (error) {
            Alert.alert('Error', error);
            router.back();
        }
    }, [error]);

    // When the paywall fires, resolve first-timer status for the intro-price display.
    useEffect(() => {
        if (paywall.active) {
            isFirstTimerSubscriber().then(setIsFirstTimer).catch(() => { });
        }
    }, [paywall.active]);

    const startTimer = (resetQuestion = false) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const now = Date.now();

        if (resetQuestion) {
            setTimeElapsed(0);
            startQuestionTimeRef.current = now;
        } else {
            startQuestionTimeRef.current = now - (timeElapsed * 1000);
        }

        startSessionTimeRef.current = now - (sessionTime * 1000);

        timerRef.current = setInterval(() => {
            const currentNow = Date.now();
            setTimeElapsed(Math.round((currentNow - startQuestionTimeRef.current) / 1000));
            setSessionTime(Math.round((currentNow - startSessionTimeRef.current) / 1000));
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleSelectOption = async (optionId: string) => {
        if (isSubmitted) return;

        setSelectedAnswer(optionId);
        setIsSubmitted(true);
        stopTimer();

        const currentQ = questions[currentIndex];
        const selectedIndex = currentQ.options.findIndex((o: any) => o.id === optionId);
        const isCorrect = selectedIndex === currentQ.correctOptionIndex;

        // Update results
        setResults(prev => [...prev, {
            questionId: currentQ.id,
            isCorrect,
            timeTaken: timeElapsed,
        }]);

        // Save to server
        try {
            const topic = config.chapters?.[0] !== 'all' ? config.chapters?.[0] : 'mixed';
            const fsmTag = currentQ.fsmTag || `${topic || 'unknown'}-default`;

            // Target time priority:
            //   1. Question's own `timeTargets[examProfile]` (AI-calibrated per question)
            //   2. Fall back to per-exam / per-difficulty `calculateTargetTime` baseline
            // This matches web's behavior — mobile previously ignored timeTargets,
            // causing mastery FSM to mark too many questions as "slow".
            const effectiveDifficulty: 'Easy' | 'Medium' | 'Hard' =
                (currentQ.difficulty === 'Easy' || currentQ.difficulty === 'Hard')
                    ? currentQ.difficulty
                    : 'Medium';
            // Single shared resolver (question timeTargets, alias-mapped for EAPCET →
            // exam/difficulty baseline) — identical to web so mastery grades consistently.
            const targetTimeMs = resolveTargetSeconds(currentQ, config.exam || 'default', effectiveDifficulty) * 1000;

            await saveAttemptAndUpdateMastery({
                questionUuid: currentQ.uuid || currentQ.id,
                fsmTag,
                isCorrect,
                timeMs: timeElapsed * 1000,
                targetTimeMs,
                selectedOptionIndex: selectedIndex === -1 ? 0 : selectedIndex,
                skipDrill: false,
            });
        } catch (err: any) {
            if (err.message?.includes('foreign key constraint') || err.code === '23503' || err.message?.includes('409')) {
                console.warn('[SessionEngine] Ghost question — skipping mastery save');
            } else {
                console.error('Failed to save progress:', err);
            }
        }

        if (!isCorrect) {
            // Show intervention modal
            setShowIntervention(true);
        } else {
            // Show "Next" button (no auto-advance)
            setShowCorrectNext(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const advanceOrComplete = () => {
        setShowIntervention(false);
        setShowCorrectNext(false);
        fadeAnim.setValue(0);

        // Check if we've reached the question count
        if (currentIndex + 1 >= questionCount) {
            // Session complete
            setShowSummary(true);
            stopTimer();
            if (onSessionComplete) onSessionComplete(results);
            return;
        }

        // Pre-fetch more if running low
        if (questions.length - (currentIndex + 1) <= 2) {
            loadMore();
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsSubmitted(false);
            startTimer(true);
        } else if (loadingMore) {
            // Waiting for more to load
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsSubmitted(false);
        } else {
            // No more questions available
            setShowSummary(true);
            stopTimer();
            if (onSessionComplete) onSessionComplete(results);
        }
    };

    // Try Similar button is hidden in InterventionModal until the mini-drill ships.
    // Keeping a no-op handler so the prop interface stays satisfied.
    const handleTrySimilar = () => { };

    const handleContinue = () => {
        advanceOrComplete();
    };

    const handleExit = () => {
        Alert.alert(
            'Finish Practice?',
            `You've answered ${results.length} question${results.length === 1 ? '' : 's'}. See your summary?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Finish', style: 'default', onPress: () => {
                        setShowSummary(true);
                        stopTimer();
                        if (onSessionComplete) onSessionComplete(results);
                    }
                },
            ]
        );
    };

    // Paywall + checkout elements — shared by the no-questions branch and the main return.
    const paywallEls = (
        <>
            <PaywallModal
                visible={paywall.active && !showCheckout}
                onClose={() => router.back()}
                onUpgrade={(plan, coupon) => { setCheckoutPlan(plan); setCheckoutCoupon(coupon ?? null); setShowCheckout(true); }}
                isFirstTimer={isFirstTimer}
                reason={paywall.reason}
            />
            <RazorpayCheckoutModal
                visible={showCheckout}
                plan={checkoutPlan}
                couponCode={checkoutCoupon}
                onClose={() => setShowCheckout(false)}
                onSuccess={() => { setShowCheckout(false); retryAfterUpgrade(); }}
            />
        </>
    );

    // --- View States ---

    // Free-tier gate hit with nothing to show yet (typically on initial load).
    if (paywall.active && questions.length === 0) {
        return <View style={styles.container}>{paywallEls}</View>;
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>
                    {config.mode === 'sprint' ? 'Setting up Sprint...' : 'Loading Practice...'}
                </Text>
            </View>
        );
    }

    if (showSummary) {
        return (
            <SessionSummary
                results={results}
                totalQuestions={questionCount}
                onExit={() => router.back()}
            />
        );
    }

    if (questions.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No questions available for this selection.</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const activeQuestion = questions[currentIndex];

    // Waiting for more questions to load
    if (!activeQuestion && loadingMore) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading next question...</Text>
            </View>
        );
    }

    if (!activeQuestion) {
        // Reached end unexpectedly
        return (
            <SessionSummary
                results={results}
                totalQuestions={questionCount}
                onExit={() => router.back()}
            />
        );
    }

    return (
        <View style={styles.container}>
            <SessionHeader
                currentIndex={currentIndex}
                totalQuestions={questionCount}
                questionTime={formatTime(timeElapsed)}
                sessionTime={formatTime(sessionTime)}
                topic={config.chapters?.[0] !== 'all' ? config.chapters?.[0] : config.subject}
                difficulty={config.difficulty || 'Medium'}
                onExit={handleExit}
            />

            <QuestionCard
                key={activeQuestion.id}
                question={activeQuestion}
                selectedAnswer={selectedAnswer}
                isSubmitted={isSubmitted}
                onSelectAnswer={handleSelectOption}
            />

            {/* Correct Answer → Next Button */}
            {showCorrectNext && (
                <Animated.View style={[styles.nextButtonContainer, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={styles.nextButton} onPress={advanceOrComplete}>
                        <Text style={styles.nextButtonText}>
                            {currentIndex + 1 >= questionCount ? 'See Results' : 'Next'}
                        </Text>
                        <ChevronRight size={20} color={Colors.white} />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Intervention Modal */}
            <InterventionModal
                visible={showIntervention}
                question={activeQuestion}
                onTrySimilar={handleTrySimilar}
                onContinue={handleContinue}
            />

            {/* Free-tier paywall (20 questions/day) + Razorpay checkout */}
            {paywallEls}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        color: Colors.textDim,
        fontSize: 16,
        textAlign: 'center',
    },
    backButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    backButtonText: {
        color: Colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
    nextButtonContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    nextButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        gap: 8,
    },
    nextButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
