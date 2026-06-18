import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getQuestionsForUser, authService, isValidQuestionForTopic, getSupabase, ALLOW_LIVE_AI_FALLBACK, isTrustedQuestion } from '@drut/shared';

// `isTrustedQuestion` (verification_status / source_type → trusted) now lives in
// @drut/shared so web + Android + iOS share ONE definition and never drift.
// See packages/shared/src/lib/questionTrust.ts and CLAUDE.md.

interface UsePracticeQuestionsProps {
    config: {
        exam: string;
        subject: string;
        chapters?: string[];
        difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
        questionCount?: number;
        mode?: 'practice' | 'sprint';
    };
    batchSize?: number;
}

/**
 * Pick a concrete difficulty for Mixed mode
 */
function pickDifficulty(): 'Easy' | 'Medium' | 'Hard' {
    const r = Math.random();
    if (r < 0.25) return 'Easy';
    if (r < 0.75) return 'Medium';
    return 'Hard';
}

export function usePracticeQuestions({ config, batchSize = 5 }: UsePracticeQuestionsProps) {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const totalTarget = config.questionCount || 10;
    const fetchedCountRef = useRef(0);

    /**
     * Force-generate a single question via the edge function as a last-resort
     * fallback when the cache returns nothing or the client validator drops
     * everything. Mirrors web's NewPractice.tsx fallback path.
     *
     * Gated by ALLOW_LIVE_AI_FALLBACK — when off, returns null without calling
     * the edge function. Keeps users from seeing ungrounded AI output during beta.
     */
    const forceGenerateOne = async (
        topic: string,
        difficulty: 'Easy' | 'Medium' | 'Hard',
    ): Promise<any | null> => {
        if (!ALLOW_LIVE_AI_FALLBACK) {
            console.log('[usePracticeQuestions] forceGenerateOne skipped — ALLOW_LIVE_AI_FALLBACK is OFF');
            return null;
        }
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.functions.invoke('generate-question', {
                body: {
                    examProfile: config.exam,
                    subject: config.subject,
                    topic,
                    difficulty,
                },
            });
            if (error || !data?.question) return null;
            const q = data.question;
            return {
                ...q,
                uuid: q.uuid || `temp-gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                fsmTag: q.fsmTag || `${topic}-generated`,
                options: (q.options || []).map((opt: any, idx: number) => ({
                    ...opt,
                    id: opt.id || `opt-${idx}-${Date.now()}-${Math.random()}`,
                })),
            };
        } catch (err) {
            console.warn('[usePracticeQuestions] Force-generate failed:', err);
            return null;
        }
    };

    const loadQuestions = async (isInitial = true) => {
        if (isInitial) {
            setLoading(true);
            fetchedCountRef.current = 0;
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const user = await authService.getCurrentUser();
            if (!user) throw new Error('User not logged in');

            // Determine how many we still need
            const remaining = totalTarget - fetchedCountRef.current;
            if (remaining <= 0) return;
            const fetchCount = Math.min(batchSize, remaining);

            // Multi-chapter rotation.
            // For "All chapters" mode, we pass the SUBJECT as the topic so the
            // backend can do a broader RAG/cache search (matching web behavior).
            // Sending the literal string 'mixed' returns nothing because the
            // cached_questions.topic column has no rows with topic='mixed'.
            const chapters = config.chapters || ['all'];
            const isAllChapters = chapters.length === 1 && chapters[0] === 'all';
            const chapter = isAllChapters
                ? config.subject
                : chapters[fetchedCountRef.current % chapters.length];

            // Resolve difficulty (Mixed → random concrete)
            const effectiveDifficulty = config.difficulty === 'Mixed'
                ? pickDifficulty()
                : (config.difficulty || 'Medium');

            console.log(`[usePracticeQuestions] Fetching ${fetchCount} questions: exam=${config.exam}, topic=${chapter}, difficulty=${effectiveDifficulty}`);

            const { questions: apiQuestions } = await getQuestionsForUser(
                user.id,
                config.exam,
                chapter,            // topic (subject when isAllChapters, chapter name otherwise)
                'mixed',            // subtopic
                fetchCount,
                effectiveDifficulty as 'Easy' | 'Medium' | 'Hard',
                undefined,          // classLevel
                undefined,          // board
                config.subject,
            );

            // Process: trust-based filter. If a question carries a trusted
            // verification_status or source_type, bypass keyword validation.
            // Otherwise validate against the chapter (or subject for All-chapters).
            const processed = (apiQuestions || [])
                .filter((q: any) => {
                    if (isTrustedQuestion(q)) return true;

                    // Non-trusted: run keyword validation against the topic key.
                    // For All-chapters mode the "topic" is actually the subject;
                    // the validator has no rule for subject-level checks and will
                    // return true (allow) — which is acceptable since the cache
                    // already filtered by subject server-side.
                    const isValid = isValidQuestionForTopic(
                        chapter,
                        q.questionText || q.question_text || q.text || '',
                    );
                    if (!isValid) {
                        console.warn(`[MobileValidator] Skipped question for ${chapter}`);
                    }
                    return isValid;
                })
                .map((q: any) => ({
                    ...q,
                    options: (q.options || []).map((opt: any, idx: number) => ({
                        ...opt,
                        id: opt.id || `opt-${idx}-${Date.now()}-${Math.random()}`,
                    })),
                }));

            if (processed.length > 0) {
                fetchedCountRef.current += processed.length;
                setQuestions(prev => [...prev, ...processed]);
                return;
            }

            // Cache + generation returned nothing OR validator dropped everything.
            // Try the force-generate edge function as a last resort.
            console.warn(`[usePracticeQuestions] No usable questions after fetch+filter. Attempting force-generate fallback.`);
            const fallback = await forceGenerateOne(chapter, effectiveDifficulty as 'Easy' | 'Medium' | 'Hard');
            if (fallback) {
                fetchedCountRef.current += 1;
                setQuestions(prev => [...prev, fallback]);
                return;
            }

            // All fallbacks exhausted
            if (isInitial) {
                setError('No questions available for this selection. Try a different chapter or difficulty.');
            }
        } catch (err: any) {
            console.error('[usePracticeQuestions] Fetch error:', err);
            setError(err.message || 'Failed to fetch questions');
            if (isInitial) {
                Alert.alert('Error', err.message || 'Failed to connect to server');
            }
        } finally {
            if (isInitial) setLoading(false);
            else setLoadingMore(false);
        }
    };

    // Initial load
    useEffect(() => {
        setQuestions([]);
        fetchedCountRef.current = 0;
        loadQuestions(true);
    }, [config.difficulty, config.subject, JSON.stringify(config.chapters), config.exam]);

    const loadMore = () => {
        if (!loading && !loadingMore && fetchedCountRef.current < totalTarget) {
            loadQuestions(false);
        }
    };

    return {
        questions,
        loading,
        loadingMore,
        error,
        loadMore,
        totalTarget,
    };
}
