import { supabase } from '../lib/supabase';
import { QuestionData } from '../types';
import { log } from '../lib/log';
import { getQuestionsForUser } from './questionCacheService';
import { EXAM_SYLLABUS_CONFIG } from '../lib/examSyllabusConfig';

/**
 * Helper to get random unique items from an array
 */
function getRandomTopics(list: string[], count: number): string[] {
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export interface SprintAttempt {
    questionId: string;
    result: 'correct' | 'wrong' | 'skipped';
    timeTaken: number;
    scoreEarned: number;
    inputMethod: 'tap' | 'click' | 'swipe' | 'keyboard_s' | 'timeout';
    questionData: QuestionData;
    selectedOptionIndex?: number;
}

export interface SprintSessionData {
    id: string;
    userId: string;
    examProfile: string;
    topic: string;
    subtopic: string;
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    skippedCount: number;
    totalScore: number;
    avgTimeMs: number;
    startedAt: string;
    endedAt: string | null;
    isRetry: boolean;
    parentSessionId: string | null;
    attempts?: SprintAttempt[];
}


const EXAM_SCORING_CONFIG: Record<string, { base: number; penalty: number }> = {
    jee_main: { base: 10, penalty: -5 }, // -1/4 equivalent relative to max 20
    jee_advanced: { base: 10, penalty: -5 },
    wbjee: { base: 10, penalty: -5 }, // Simplification for now
    cat: { base: 10, penalty: -3 }, // 1/3
    eamcet: { base: 10, penalty: 0 },
    mht_cet: { base: 10, penalty: 0 },
    kcet: { base: 10, penalty: 0 },
    gujcet: { base: 10, penalty: 0 },
    keam: { base: 10, penalty: -5 }, // usually has negative
    default: { base: 10, penalty: 0 }
};

export function calculateSprintScore(isCorrect: boolean, timeMs: number, examProfile: string = 'default'): number {
    const config = EXAM_SCORING_CONFIG[examProfile] || EXAM_SCORING_CONFIG.default;

    if (!isCorrect) {
        // Apply Penalty for wrong answers
        return config.penalty;
    }

    // Formula: Base + SpeedBonus
    // Max score: 10 + 10 = 20 (at 0s)
    // Min score: 10 + 0 = 10 (at 45s) - Note: This 45s is legacy speed audit, 
    // we should probably scale bonus based on the Exam Target Time eventually.
    // For now, keeping the 45s curve for 'Speed Bonus' intensity across all exams 
    // to encourage speed even in slower exams, OR we strictly punish time.
    // Let's stick to the existing curve for consistency in "Sprint Points".

    // timeMs is in ms, so convert to seconds
    const timeSec = timeMs / 1000;
    const bonus = Math.round((45 - timeSec) / 4.5);
    const clampedBonus = Math.max(0, Math.min(10, bonus));

    return config.base + clampedBonus;
}


/**
 * Start a new Sprint Session
 * Creates DB entry and fetches initial batch of questions
 */
export async function startSession(
    userId: string,
    topic: string,
    questionCount: number,
    examProfile: string,
    subtopic: string,
    isRetry: boolean = false
): Promise<{ sessionId: string; questions: QuestionData[] }> {
    try {
        // 1. Create Session in DB
        const sessionId = await createSprintSession(
            userId,
            examProfile,
            topic,
            subtopic,
            isRetry // isRetry
        );

        // 2. Fetch Questions
        // Logic for "Full Syllabus" Weighted Fetching (MHT CET 80/20)
        let questions: QuestionData[] = [];
        const config = EXAM_SYLLABUS_CONFIG[examProfile];

        if (topic === 'full_syllabus' && config) {
            console.log(`[sprint] Starting Full Syllabus Session for ${examProfile} (80/20 Rule)`);

            // 1. Calculate Weighted Counts
            const c11Count = Math.round(questionCount * config.fetching_logic.class_11_ratio);
            const c12Count = questionCount - c11Count;

            // 2. Select Random Topics
            // We pick one topic for Class 11 and one for Class 12 to generate/fetch questions from
            // In a real Mock, we might want to distribute across chapters, but for a 10-Q Sprint, 
            // focus is better. Or we can loop? 
            // Let's loop 2 topics for diversity if count > 5
            const c11Topics = getRandomTopics(config.syllabus_rules.class_11_whitelist, 2);
            const c12Topics = getRandomTopics(config.syllabus_rules.class_12_whitelist, 3); // More topics for C12

            // 3. Fetch (Parallel)
            // Distribute questions roughly evenly among selected topics
            const qPerTopic11 = Math.ceil(c11Count / c11Topics.length);
            const qPerTopic12 = Math.ceil(c12Count / c12Topics.length);

            const promises = [
                ...c11Topics.map(t => getQuestionsForUser(userId, examProfile, t, 'general', qPerTopic11, 'Medium')),
                ...c12Topics.map(t => getQuestionsForUser(userId, examProfile, t, 'general', qPerTopic12, 'Medium'))
            ];

            const results = await Promise.all(promises);
            questions = results.flatMap(r => r.questions);

            // Shuffle and trim to exact count
            questions = questions.sort(() => Math.random() - 0.5).slice(0, questionCount);

            // Fix metadata for the session (topic -> 'mixed')
            topic = 'full_syllabus';
            subtopic = 'mixed';
        } else {
            // Standard Single-Topic Fetch
            // Standard Single-Topic Fetch
            let fetchedCount = 0;
            const targetCount = questionCount;
            let attempts = 0;

            while (fetchedCount < targetCount && attempts < 3) {
                const needed = targetCount - fetchedCount;
                // Determine difficulty based on attempts or fixed? Sprint usually Medium.
                // Maybe reduce difficulty if we run out? No.
                const res = await getQuestionsForUser(
                    userId,
                    examProfile,
                    topic,
                    subtopic,
                    needed, // Ask for what's missing
                    'Medium'
                );

                // Avoid duplicates if getQuestionsForUser returns some duplicates (it shouldn't if cache logic works, but let's be safe)
                // Actually getQuestionsForUser marks them seen, so subsequent calls shouldn't return same unless we ran out of unique.
                const newQs = res.questions.filter(nq => !questions.some(eq => eq.uuid === nq.uuid));

                questions = [...questions, ...newQs];
                fetchedCount = questions.length;
                attempts++;

                if (newQs.length === 0) break; // Stop if we get nothing back
            }

            // If still short, we might have to reuse questions (seen) or just proceed with what we have.
            // User complained about getting 3 when asked for 10.
            // If we really can't generate, we should probably warn or reuse.
            // For now, let's just ensure we TRIED multiple times. 
            // Also, slicing to exact count if we went over (unlikely with this logic but good practice)
            questions = questions.slice(0, targetCount);
        }

        return { sessionId, questions };
    } catch (error: any) {
        log.error('[sprint] Failed to start session:', error);
        throw error;
    }
}

/**
 * Create a new Sprint session
 */
export async function createSprintSession(
    userId: string,
    examProfile: string,
    topic: string,
    subtopic: string,
    isRetry: boolean = false,
    parentSessionId?: string
): Promise<string> {
    try {
        console.log('[DEBUG] createSprintSession called with:', { userId, examProfile, topic, subtopic, isRetry });

        const { data, error } = await supabase
            .from('sprint_sessions')
            .insert({
                user_id: userId,
                exam_profile: examProfile,
                topic,
                subtopic,
                is_retry: isRetry,
                parent_session_id: parentSessionId || null,
            })
            .select('id')
            .single();

        if (error) {
            console.error('[DEBUG] createSprintSession INSERT FAILED:', error);
            throw error;
        }

        console.log('[DEBUG] createSprintSession SUCCESS - session ID:', data.id);
        log.info(`[sprint] Created session ${data.id}`);
        return data.id;
    } catch (error: any) {
        console.error('[DEBUG] createSprintSession EXCEPTION:', error);
        log.error('[sprint] Failed to create session:', error);
        throw new Error(`Failed to create Sprint session: ${error.message}`);
    }
}

/**
 * Create a specialized Retry Session (Background)
 * Does NOT fetch questions. Just creates the session container.
 */
export async function createRetrySession(
    userId: string,
    topic: string,
    subtopic: string,
    examProfile: string
): Promise<string> {
    return createSprintSession(userId, examProfile, topic, subtopic, true); // true = isRetry
}

/**
 * Save a Sprint question attempt
 * Also updates pattern mastery if the question has an fsm_tag
 */
export async function saveSprintAttempt(
    sessionId: string,
    userId: string,
    attempt: SprintAttempt
): Promise<void> {
    try {
        console.log('[DEBUG] saveSprintAttempt called with:', { sessionId, userId, questionId: attempt.questionId, result: attempt.result });

        // 1. Save to sprint_question_attempts (sprint-specific tracking)
        const { error } = await supabase
            .from('sprint_question_attempts')
            .insert({
                session_id: sessionId,
                user_id: userId,
                question_id: attempt.questionId,
                result: attempt.result,
                time_taken_ms: attempt.timeTaken,
                score_earned: attempt.scoreEarned,
                input_method: attempt.inputMethod,
                question_data: attempt.questionData,
                selected_option_index: attempt.selectedOptionIndex,
            });

        if (error) {
            console.error('[DEBUG] saveSprintAttempt INSERT FAILED:', error);
            throw error;
        }

        console.log('[DEBUG] saveSprintAttempt SUCCESS for session:', sessionId);
        log.info(`[sprint] Saved attempt for session ${sessionId}`);

        // 2. Also update pattern mastery if question has fsm_tag
        // This ensures Sprint answers contribute to dashboard stats
        const fsmTag = attempt.questionData?.fsmTag || 'general';
        if (fsmTag && fsmTag !== 'general') {
            const isCorrect = attempt.result === 'correct';
            const targetTimeMs = 45000; // Sprint default: 45 seconds

            try {
                await supabase.rpc('save_attempt_and_update_mastery', {
                    p_user_id: userId,
                    p_question_uuid: attempt.questionId,
                    p_fsm_tag: fsmTag,
                    p_is_correct: isCorrect,
                    p_time_ms: attempt.timeTaken,
                    p_target_time_ms: targetTimeMs,
                    p_selected_option_index: attempt.selectedOptionIndex ?? -1,
                    p_skip_drill: false, // Sprint doesn't have drill mode
                });
                console.log('[DEBUG] Pattern mastery updated for fsm_tag:', fsmTag);
            } catch (masteryError) {
                // Non-critical: log but don't fail the main operation
                console.warn('[DEBUG] Pattern mastery update failed (non-critical):', masteryError);
            }
        }
    } catch (error: any) {
        console.error('[DEBUG] saveSprintAttempt EXCEPTION:', error);
        log.error('[sprint] Failed to save attempt:', error);
        // Don't throw - we don't want to break the session if tracking fails
    }
}

/**
 * Finalize a Sprint session with stats
 */
export async function finalizeSprintSession(
    sessionId: string,
    stats: {
        totalQuestions: number;
        correctCount: number;
        wrongCount: number;
        skippedCount: number;
        totalScore: number;
        avgTimeMs: number;
    }
): Promise<void> {
    try {
        const { error } = await supabase
            .from('sprint_sessions')
            .update({
                total_questions: stats.totalQuestions,
                correct_count: stats.correctCount,
                wrong_count: stats.wrongCount,
                skipped_count: stats.skippedCount,
                total_score: stats.totalScore,
                avg_time_ms: stats.avgTimeMs,
                ended_at: new Date().toISOString(),
            })
            .eq('id', sessionId);

        if (error) throw error;

        log.info(`[sprint] Finalized session ${sessionId} - Score: ${stats.totalScore}`);
    } catch (error: any) {
        log.error('[sprint] Failed to finalize session:', error);
        throw new Error(`Failed to finalize session: ${error.message}`);
    }
}

/**
 * Get Sprint session data with attempts
 */
export async function getSprintSessionData(sessionId: string): Promise<SprintSessionData> {
    try {
        // Get session
        const { data: session, error: sessionError } = await supabase
            .from('sprint_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError) throw sessionError;

        // Get attempts
        const { data: attempts, error: attemptsError } = await supabase
            .from('sprint_question_attempts')
            .select('*')
            .eq('session_id', sessionId)
            .order('attempted_at', { ascending: true });

        if (attemptsError) throw attemptsError;

        log.info(`[sprint] Loaded session ${sessionId} with ${attempts?.length || 0} attempts`);

        return {
            id: session.id,
            userId: session.user_id,
            examProfile: session.exam_profile,
            topic: session.topic,
            subtopic: session.subtopic,
            totalQuestions: session.total_questions,
            correctCount: session.correct_count,
            wrongCount: session.wrong_count,
            skippedCount: session.skipped_count,
            totalScore: session.total_score,
            avgTimeMs: session.avg_time_ms,
            startedAt: session.started_at,
            endedAt: session.ended_at,
            isRetry: session.is_retry,
            parentSessionId: session.parent_session_id,
            attempts: attempts?.map(a => ({
                questionId: a.question_id,
                result: a.result,
                timeTaken: a.time_taken_ms,
                scoreEarned: a.score_earned,
                inputMethod: a.input_method,
                questionData: a.question_data,
                selectedOptionIndex: a.selected_option_index,
            })) || [],
        };
    } catch (error: any) {
        log.error('[sprint] Failed to load session:', error);
        throw new Error(`Failed to load session data: ${error.message}`);
    }
}

/**
 * Get user's recent Sprint sessions
 */
export async function getUserSprintHistory(
    userId: string,
    limit: number = 10
): Promise<SprintSessionData[]> {
    try {
        const { data, error } = await supabase
            .from('sprint_sessions')
            .select('*')
            .eq('user_id', userId)
            .not('ended_at', 'is', null) // Only completed sessions
            .order('ended_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data?.map(s => ({
            id: s.id,
            userId: s.user_id,
            examProfile: s.exam_profile,
            topic: s.topic,
            subtopic: s.subtopic,
            totalQuestions: s.total_questions,
            correctCount: s.correct_count,
            wrongCount: s.wrong_count,
            skippedCount: s.skipped_count,
            totalScore: s.total_score,
            avgTimeMs: s.avg_time_ms,
            startedAt: s.started_at,
            endedAt: s.ended_at,
            isRetry: s.is_retry,
            parentSessionId: s.parent_session_id,
        })) || [];
    } catch (error: any) {
        log.error('[sprint] Failed to load history:', error);
        return [];
    }
}
