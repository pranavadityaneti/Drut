import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { getQuestionsForUser, authService, isValidQuestionForTopic } from '@drut/shared';

interface UsePracticeQuestionsProps {
    config: {
        exam: string;
        subject: string;
        topic?: string;
        mode?: 'practice' | 'sprint';
    };
    batchSize?: number;
    difficulty?: 'Easy' | 'Medium' | 'Hard'; // New prop
}

export function usePracticeQuestions({ config, batchSize = 3, difficulty = 'Medium' }: UsePracticeQuestionsProps) {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep track of total fetched to avoid duplicates or for analytics if needed
    // But mainly we just append.

    const loadQuestions = async (isInitial = true) => {
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                throw new Error('User not logged in');
            }

            console.log(`[usePracticeQuestions] Fetching ${batchSize} questions (Initial: ${isInitial})`);

            const { questions: apiQuestions } = await getQuestionsForUser(
                user.id,
                config.exam,
                config.topic || 'mixed',
                'mixed', // subtopic
                batchSize,
                difficulty, // difficulty
                undefined, // classLevel
                undefined, // board
                config.subject
            );

            if (!apiQuestions || apiQuestions.length === 0) {
                if (isInitial) {
                    setError('No questions found');
                } else {
                    console.log('No more questions returned from API');
                }
            } else {
                // Ensure IDs and FILTER based on Validation Rules
                const processed = apiQuestions
                    .filter((q: any) => {
                        // Check validity
                        // Use topic from config or fallback
                        const topicToCheck = config.topic || 'mixed';
                        const isValid = isValidQuestionForTopic(topicToCheck, q.question_text || q.text);
                        if (!isValid) {
                            console.warn(`[MobileValidator] Skipped invalid question for ${topicToCheck}`);
                        }
                        return isValid;
                    })
                    .map((q: any) => ({
                        ...q,
                        options: q.options.map((opt: any, idx: number) => ({
                            ...opt,
                            id: opt.id || `opt-${idx}-${Date.now()}-${Math.random()}`
                        }))
                    }));

                if (processed.length === 0 && apiQuestions.length > 0) {
                    // All fetched questions were invalid!
                    // In a real scenario, we should recursively fetch more here.
                    // For now, let's just log it.
                    console.warn('[MobileValidator] All fetched questions were filtered out! Requesting more...');
                    // loadQuestions(isInitial); // Potentially dangerous recursion without limit
                }

                setQuestions(prev => {
                    return [...prev, ...processed];
                });
            }

        } catch (err: any) {
            console.error('Fetch Error:', err);
            setError(err.message || 'Failed to fetch questions');
            if (isInitial) {
                Alert.alert('Error', err.message || 'Failed to connect to server');
            }
        } finally {
            if (isInitial) {
                setLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    };

    // Initial Load & Difficulty Change
    useEffect(() => {
        // If difficulty changes, we want to reset and reload
        setQuestions([]);
        loadQuestions(true);
    }, [difficulty]);

    // Helper to load more
    const loadMore = () => {
        if (!loading && !loadingMore) {
            loadQuestions(false);
        }
    };

    return {
        questions,
        loading,
        loadingMore,
        error,
        loadMore
    };
}
