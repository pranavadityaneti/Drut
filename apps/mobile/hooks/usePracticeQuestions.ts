import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getQuestionsForUser, getReviewQuestionsForUser, isServableQuestion, authService, getSupabase, ALLOW_LIVE_AI_FALLBACK, isPaywallError } from '@drut/shared';

// Serving trust is centralized in @drut/shared `isServableQuestion` (new-format +
// approved source) so web and mobile serve the IDENTICAL pool. The old per-client
// TRUSTED_STATUS list wrongly included `v3-verified-rag`/`v3-verified-textbook`,
// which served ~5,500 old-format legacy questions (banned framework labels).

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
    // Free-tier 20/day gate signal — kept separate from `error` so the UI shows
    // the upgrade modal (not an error alert) and so router-back-on-error doesn't fire.
    const [paywall, setPaywall] = useState<{ active: boolean; reason?: string }>({ active: false });
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

            // Shared serving gate: new-format + approved source (same as web).
            // The DB query already constrains topic/subtopic/difficulty, so the
            // old per-client keyword validator is no longer needed — and it was
            // letting old-format legacy rows through.
            const processed = (apiQuestions || [])
                .filter((q: any) => isServableQuestion(q))
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

            // Unseen pool exhausted/empty for this filter. Before any (gated) live
            // generation, fall back to VERIFIED REVIEW questions — already-seen, real
            // DB rows for the same filter. Mirrors web's review-seen fallback so both
            // platforms recycle verified content instead of dead-ending. Applies the
            // SAME shared serving gate (isServableQuestion); never live-generates.
            const { questions: reviewQs } = await getReviewQuestionsForUser(
                config.exam,
                chapter,            // topic (subject when isAllChapters, chapter name otherwise)
                'mixed',            // subtopic
                fetchCount,
                effectiveDifficulty as 'Easy' | 'Medium' | 'Hard',
                config.subject,
            );
            const reviewProcessed = (reviewQs || [])
                .filter(isServableQuestion)
                .map((q: any) => ({
                    ...q,
                    options: (q.options || []).map((opt: any, idx: number) => ({
                        ...opt,
                        id: opt.id || `opt-${idx}-${Date.now()}-${Math.random()}`,
                    })),
                }));
            if (reviewProcessed.length > 0) {
                console.log(`[usePracticeQuestions] Filled ${reviewProcessed.length} from verified review pool (no live-gen).`);
                fetchedCountRef.current += reviewProcessed.length;
                setQuestions(prev => [...prev, ...reviewProcessed]);
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
            // Free-tier daily quota reached → surface the paywall, not an error alert.
            if (isPaywallError(err)) {
                setPaywall({ active: true, reason: err.reason });
                return;
            }
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
        setPaywall({ active: false });
        loadQuestions(true);
    }, [config.difficulty, config.subject, JSON.stringify(config.chapters), config.exam]);

    const loadMore = () => {
        if (!loading && !loadingMore && !paywall.active && fetchedCountRef.current < totalTarget) {
            loadQuestions(false);
        }
    };

    /** Call after a successful upgrade — clears the gate and refetches from scratch. */
    const retryAfterUpgrade = () => {
        setPaywall({ active: false });
        setError(null);
        setQuestions([]);
        fetchedCountRef.current = 0;
        loadQuestions(true);
    };

    return {
        questions,
        loading,
        loadingMore,
        error,
        paywall,
        loadMore,
        retryAfterUpgrade,
        totalTarget,
    };
}
