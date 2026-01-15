import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { SessionHeader } from './SessionHeader';
import { QuestionCard } from './QuestionCard';
import { SessionSummary } from './SessionSummary';
import { useRouter } from 'expo-router';
import { getQuestionsForUser, authService, saveAttemptAndUpdateMastery } from '@drut/shared';
import { usePracticeQuestions } from '../hooks/usePracticeQuestions';
import { InterventionModal } from './practice/InterventionModal';

// Helper for Timer formatting
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface SessionEngineProps {
    config: {
        exam: string;
        subject: string;
        topic?: string;
        mode?: 'practice' | 'sprint';
    };
    onSessionComplete?: (results: any) => void;
}

export const SessionEngine: React.FC<SessionEngineProps> = ({ config, onSessionComplete }) => {
    const router = useRouter();

    // State
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const { questions, loading, loadingMore, error, loadMore } = usePracticeQuestions({
        config,
        batchSize: 3,
        difficulty // Pass to hook
    });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Results & Summary State
    const [results, setResults] = useState<any[]>([]);
    const [showSummary, setShowSummary] = useState(false);

    // Timer State
    const [timeElapsed, setTimeElapsed] = useState(0); // Current Question Time
    const [sessionTime, setSessionTime] = useState(0); // Total Session Time
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startQuestionTimeRef = useRef<number>(0);
    const startSessionTimeRef = useRef<number>(0);

    // Start Timer when questions load
    useEffect(() => {
        if (!loading && questions.length > 0) {
            startTimer();
        }
        return () => stopTimer();
    }, [loading]);

    const startTimer = (resetQuestion = false) => {
        if (timerRef.current) clearInterval(timerRef.current);

        // Initialize start times based on current elapsed (to resume correctly)
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

    // Error Handling
    useEffect(() => {
        if (error) {
            Alert.alert('Error', error);
            router.back();
        }
    }, [error]);

    // Intervention State
    const [showIntervention, setShowIntervention] = useState(false);

    const handleSelectOption = async (optionId: string) => {
        if (isSubmitted) return;

        setSelectedAnswer(optionId);
        setIsSubmitted(true);
        stopTimer();

        // Check correctness (Index based comparison)
        const currentQ = questions[currentIndex];

        // Find index of selected option ID
        const selectedIndex = currentQ.options.findIndex((o: any) => o.id === optionId);
        const isCorrect = selectedIndex === currentQ.correctOptionIndex;

        // Update Local Results
        setResults(prev => [...prev, {
            questionId: currentQ.id,
            isCorrect,
            timeTaken: timeElapsed
        }]);

        // Server-Side Submission
        // ----------------------------------------------------
        try {
            // Find index of selected option
            const selectedOptionIndex = currentQ.options.findIndex((o: any) => o.id === optionId);
            const fsmTag = currentQ.fsmTag || `${config.topic || 'unknown'}-default`;

            await saveAttemptAndUpdateMastery({
                questionUuid: currentQ.uuid || currentQ.id,
                fsmTag: fsmTag,
                isCorrect: isCorrect,
                timeMs: timeElapsed * 1000,
                targetTimeMs: 45000,
                selectedOptionIndex: selectedOptionIndex === -1 ? 0 : selectedOptionIndex,
                skipDrill: false,
            });
        } catch (err: any) {
            // TRAP GHOST QUESTION ERROR
            if (err.message?.includes('foreign key constraint') || err.code === '23503' || err.message?.includes('409')) {
                console.warn("[SessionEngine] Could not save mastery for Ghost Question. Continuing...");
            } else {
                console.error('Failed to save progress:', err);
                // Optional: Alert user or just keep going?
            }
        }

        if (!isCorrect) {
            // SHOW INTERVENTION MODAL
            setShowIntervention(true);
            // DO NOT auto-advance
        } else {
            // Correct answer? Auto-advance
            setTimeout(() => {
                advanceToNext();
            }, 1000); // Faster advance for correct
        }
    };

    const advanceToNext = () => {
        setShowIntervention(false);

        // Check if we need to load more (Refill Logic)
        // Improved for smaller batches: fetch earlier (when 1 or fewer left)
        if (questions.length - currentIndex <= 1) {
            console.log('Pre-fetching more questions...');
            loadMore();
        }

        if (currentIndex < questions.length - 1) {
            // Next Question
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsSubmitted(false);
            // Reset Question Timer AND Start
            startTimer(true);
        } else {
            // We are at the end...
            if (loadingMore) {
                // Wait for more... user sees spinner logic below
                setCurrentIndex(prev => prev + 1); // This will cause activeQuestions to be undefined momentarily, handled by check below
                setSelectedAnswer(null);
                setIsSubmitted(false);
            } else {
                // Really no more questions? Or just failed to load?
                // For infinite scroll, this shouldn't happen ideally unless error or end of world.
                // We can show "Generating..."
                Alert.alert('Generating...', 'Please wait while we create more questions for you.');
                loadMore();
            }
        }
    };


    const handleTrySimilar = () => {
        console.log("Trigger Mini-Practice Loop (Phase 2)");
        Alert.alert("Coming Soon", "Try Similar Mode will trigger a 3-question drill.");
    };

    const handleContinue = () => {
        advanceToNext();
    };

    const handleExit = () => {
        // Manual "Finish" trigger
        Alert.alert(
            'Finish Practice?',
            'See your summary report?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Finish', style: 'default', onPress: () => {
                        setShowSummary(true);
                        if (onSessionComplete) onSessionComplete(results);
                    }
                }
            ]
        );
    };

    const handleToggleDifficulty = () => {
        Alert.alert(
            'Select Difficulty',
            `Current: ${difficulty}`,
            [
                { text: 'Easy', onPress: () => changeDifficulty('Easy') },
                { text: 'Medium', onPress: () => changeDifficulty('Medium') },
                { text: 'Hard', onPress: () => changeDifficulty('Hard') },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const changeDifficulty = (level: 'Easy' | 'Medium' | 'Hard') => {
        if (level === difficulty) return;
        setDifficulty(level);
        // The Hook will automatically reset and fetch new questions when `difficulty` changes.
        // We just need to reset our local index.
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setTimeElapsed(0);
    };

    // ----------------------
    // View States
    // ----------------------

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
                totalQuestions={questions.length}
                onExit={() => router.back()}
            />
        );
    }

    if (questions.length === 0) return null;

    const activeQuestion = questions[currentIndex];

    // Handle "Waiting for more questions" state
    if (!activeQuestion && loadingMore) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Generating new questions...</Text>
            </View>
        );
    }

    if (!activeQuestion) return null;

    return (
        <View style={styles.container}>
            <SessionHeader
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                questionTime={formatTime(timeElapsed)}
                sessionTime={formatTime(sessionTime)}
                topic={config.topic}
                difficulty={difficulty}
                onExit={handleExit}
                onToggleDifficulty={handleToggleDifficulty}
            />

            <QuestionCard
                key={activeQuestion.id}
                question={activeQuestion}
                selectedAnswer={selectedAnswer}
                isSubmitted={isSubmitted}
                onSelectAnswer={handleSelectOption}
            />



            {/* INTERVENTION MODAL Overlay (New Phase 1) */}
            <InterventionModal
                visible={showIntervention}
                question={activeQuestion}
                onTrySimilar={handleTrySimilar}
                onContinue={handleContinue}
            />

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
    },
    loadingText: {
        marginTop: 16,
        color: Colors.textDim,
        fontSize: 16,
    }
});
