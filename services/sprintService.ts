import { supabase } from '../lib/supabase';
import { QuestionData } from '../types';
import { log } from '../lib/log';

export interface SprintAttempt {
    questionId: string;
    result: 'correct' | 'wrong' | 'skipped';
    timeTaken: number;
    scoreEarned: number;
    inputMethod: 'tap' | 'click' | 'swipe' | 'keyboard_s' | 'timeout';
    questionData: QuestionData;
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

/**
 * Calculate score for a Sprint question
 * Correct = 10 + speed bonus (0-5)
 * Wrong/Skip = 0
 */
export function calculateSprintScore(isCorrect: boolean, timeMs: number): number {
    if (!isCorrect) return 0;

    const speedBonus = Math.floor(5 * (1 - timeMs / 45000));
    const clampedBonus = Math.max(0, Math.min(5, speedBonus));

    return 10 + clampedBonus; // 10-15 points
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

        if (error) throw error;

        log.info(`[sprint] Created session ${data.id}`);
        return data.id;
    } catch (error: any) {
        log.error('[sprint] Failed to create session:', error);
        throw new Error(`Failed to create Sprint session: ${error.message}`);
    }
}

/**
 * Save a Sprint question attempt
 */
export async function saveSprintAttempt(
    sessionId: string,
    userId: string,
    attempt: SprintAttempt
): Promise<void> {
    try {
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
            });

        if (error) throw error;

        log.info(`[sprint] Saved attempt for session ${sessionId}`);
    } catch (error: any) {
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
