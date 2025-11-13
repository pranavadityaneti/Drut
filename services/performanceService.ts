import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

// This function now expects a payload that matches the new, simplified schema.
export const savePerformanceRecord = async (payload: {
  questionId: string;
  isCorrect: boolean;
  timeMs: number;
  // NOTE: firstActionMs has been removed to align with the updated database schema.
}) => {
    const supabase = getSupabase();
    if (!supabase) {
        log.error('[perf] Supabase client not available.');
        throw new Error("Could not save your progress.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        log.error('[perf] not authenticated');
        throw new Error("User not authenticated");
    }

    const newRecord = {
        user_id: user.id,        // <-- Critical for RLS
        question_id: payload.questionId,
        is_correct: payload.isCorrect,
        time_ms: Math.round(payload.timeMs), // Ensure it's an integer
    };

    const { error } = await supabase.from('performance_records').insert(newRecord);

    if (error) {
        log.error('[perf] insert failed', error);
        throw new Error("Could not save your progress.");
    }
};

// getPerformanceHistory and clearPerformanceHistory are no longer needed
// as analytics are handled server-side and clearing can be done via Supabase dashboard.