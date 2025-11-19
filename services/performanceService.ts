import { supabase } from '../lib/supabase';

export async function savePerformance(
  isCorrect: boolean,
  qid: string,
  timeMs: number
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const params = {
    is_correct: isCorrect,
    question_id: qid,
    time_ms: timeMs,
  };

  const { data, error } = await supabase.rpc('log_performance_v1', {
    p_params: params,
  });

  if (error) throw error;
  return data;
}
