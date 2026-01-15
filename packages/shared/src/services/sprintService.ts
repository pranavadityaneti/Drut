import { supabase } from '../lib/supabase';
import { QuestionData } from '../types';
import { log } from '../lib/log';
import { getQuestionsForUser } from './questionCacheService';
import { EXAM_SYLLABUS_CONFIG } from '../lib/examSyllabusConfig';

// Supabase Edge Function URL for diagram generation
const SUPABASE_URL = 'https://ukrtaerwaxekonislnpw.supabase.co';

/**
 * Trigger diagram generation for questions that need it.
 * This runs asynchronously in the background while the user starts practicing.
 * @param questions - Array of questions to process for diagram generation
 * @returns Promise that resolves with updated questions (with diagramUrl if available)
 */
export async function triggerDiagramGeneration(
    questions: QuestionData[]
): Promise<QuestionData[]> {
    // Filter questions that need diagrams (have visualDescription and diagramRequired is true)
    const needsDiagram = questions.filter(q =>
        (q as any).visualDescription &&
        ((q as any).diagramRequired === true || (q as any).diagramRequired === undefined)
    );

    if (needsDiagram.length === 0) {
        log.info('[sprint] No questions require diagram generation');
        return questions;
    }

    log.info(`[sprint] Triggering diagram generation for ${needsDiagram.length} questions`);

    // Get the service key for authenticated Edge Function calls
    // For client-side, we'll use the anon key and edge function auth
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    if (!authToken) {
        log.warn('[sprint] No auth token available for diagram generation');
        return questions;
    }

    // Process diagrams in parallel (fire-and-forget background task)
    const diagramPromises = needsDiagram.map(async (q) => {
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-diagram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    questionId: q.uuid,
                    visualDescription: (q as any).visualDescription,
                }),
            });

            if (!response.ok) {
                log.warn(`[sprint] Diagram generation failed for ${q.uuid}: ${response.status}`);
                return { uuid: q.uuid, diagramUrl: null };
            }

            const data = await response.json();
            log.info(`[sprint] Diagram generated for ${q.uuid}: ${data.diagramUrl}`);
            return { uuid: q.uuid, diagramUrl: data.diagramUrl };
        } catch (error) {
            log.error(`[sprint] Diagram generation error for ${q.uuid}:`, error);
            return { uuid: q.uuid, diagramUrl: null };
        }
    });

    // Wait for all diagrams to complete
    const diagramResults = await Promise.allSettled(diagramPromises);

    // Map diagram URLs back to questions
    const diagramUrlMap = new Map<string, string>();
    diagramResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.diagramUrl) {
            diagramUrlMap.set(result.value.uuid, result.value.diagramUrl);
        }
    });

    // Return questions with updated diagramUrls
    return questions.map(q => {
        const diagramUrl = diagramUrlMap.get(q.uuid);
        if (diagramUrl) {
            return { ...q, diagramUrl } as QuestionData;
        }
        return q;
    });
}

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


// Exam-specific scoring configuration (Real exam ratios)
const EXAM_SCORING_CONFIG: Record<string, { base: number; penalty: number }> = {
    jee_main: { base: 100, penalty: -25 },     // 4:1 ratio (correct: +4, wrong: -1)
    jee_advanced: { base: 100, penalty: -25 }, // 4:1 ratio
    wbjee: { base: 100, penalty: -25 },        // Similar to JEE
    cat: { base: 100, penalty: -33 },          // 3:1 ratio
    eamcet: { base: 100, penalty: 0 },         // No negative marking
    mht_cet: { base: 100, penalty: 0 },        // No negative marking
    kcet: { base: 100, penalty: 0 },           // No negative marking
    gujcet: { base: 100, penalty: 0 },         // No negative marking
    keam: { base: 100, penalty: -25 },         // Has negative marking
    default: { base: 100, penalty: 0 }
};

// Base target times per exam (in seconds)
const EXAM_BASE_TIMES: Record<string, number> = {
    jee_main: 120,      // 2 minutes average
    jee_advanced: 180,  // 3 minutes (harder questions)
    mht_cet: 54,        // ~1 minute
    eamcet: 60,
    wbjee: 90,
    kcet: 60,
    gujcet: 60,
    keam: 60,
    cat: 120,
    default: 60
};

// Difficulty multipliers for target time
const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
    Easy: 0.6,
    Medium: 1.0,
    Hard: 1.5
};

/**
 * Calculate target time based on exam profile and difficulty
 * Example: JEE Main (120s) * Hard (1.5) = 180s
 */
export function calculateTargetTime(
    examProfile: string = 'default',
    difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): number {
    const baseTime = EXAM_BASE_TIMES[examProfile] || EXAM_BASE_TIMES.default;
    const multiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
    return Math.round(baseTime * multiplier);
}

/**
 * Calculate Sprint score based on correctness, time, and exam profile
 * Uses exam-specific base points and penalties
 */
export function calculateSprintScore(
    isCorrect: boolean,
    timeMs: number,
    examProfile: string = 'default',
    difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): number {
    const config = EXAM_SCORING_CONFIG[examProfile] || EXAM_SCORING_CONFIG.default;

    if (!isCorrect) {
        // Apply exam-specific penalty for wrong answers
        return config.penalty;
    }

    // Calculate speed bonus based on target time for this exam/difficulty
    const targetTimeMs = calculateTargetTime(examProfile, difficulty) * 1000;
    const timeSec = timeMs / 1000;
    const targetTimeSec = targetTimeMs / 1000;

    // Speed bonus: Up to 50% of base score for fast answers
    // Full bonus at 0s, 0 bonus at target time, no bonus beyond target
    const maxBonus = config.base * 0.5; // 50 points max bonus
    const bonusRatio = Math.max(0, (targetTimeSec - timeSec) / targetTimeSec);
    const speedBonus = Math.round(maxBonus * bonusRatio);

    return config.base + speedBonus;
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
    isRetry: boolean = false,
    classLevel?: string,
    board?: string,
    subject?: string
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
                ...c11Topics.map(t => getQuestionsForUser(userId, examProfile, t, 'general', qPerTopic11, 'Medium', '11', board, subject)),
                ...c12Topics.map(t => getQuestionsForUser(userId, examProfile, t, 'general', qPerTopic12, 'Medium', '12', board, subject))
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
                    'Medium',
                    classLevel,
                    board,
                    subject
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

        // 3. Trigger diagram generation for questions that need it (async, non-blocking)
        // This populates diagramUrl for questions with visualDescription
        log.info(`[sprint] Starting diagram generation for ${questions.length} questions`);
        questions = await triggerDiagramGeneration(questions);

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
