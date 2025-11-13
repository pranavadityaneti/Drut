import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

// This function now calls a secure, JSON-based server-side RPC function.
// This is more resilient to parameter ordering issues in the Supabase API layer.
export const savePerformanceRecord = async ({ questionId, isCorrect, timeMs }: {
  questionId: string;
  isCorrect: boolean;
  timeMs: number;
}) => {
    const supabase = getSupabase();
    if (!supabase) {
        log.error('[perf] Supabase client not available.');
        throw new Error("Could not save your progress: Supabase client not available.");
    }

    // The RPC function on the backend will verify authentication, but it's good practice
    // to ensure there's a session before making the call.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      log.error('[perf] not authenticated');
      throw new Error("Could not save your progress: User not authenticated.");
    }

    // Call the resilient JSON wrapper function.
    // The object keys must match what the function expects in its JSON payload.
    const { data, error } = await supabase.rpc('log_performance_v1_json', {
        p_question_id: questionId,
        p_is_correct: isCorrect,
        p_time_ms: Math.round(timeMs),
    });

    if (error) {
        log.error('[perf] rpc log_performance_v1_json failed', error);
        // Throw a detailed error message to make debugging easier.
        throw new Error(`RPC 'log_performance_v1_json' failed: ${JSON.stringify(error, null, 2)}`);
    }
    
    return data;
};

// getPerformanceHistory and clearPerformanceHistory are no longer needed
// as analytics are handled server-side and clearing can be done via Supabase dashboard.