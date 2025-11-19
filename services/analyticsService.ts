import { supabase } from '../lib/supabase';

export type AnalyticsRow = {
  total_attempts: number;
  correct_attempts: number;
  accuracy_pct: number;
  avg_time_ms: number;
};

export async function fetchUserAnalytics(): Promise<AnalyticsRow> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_user_analytics');
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { total_attempts: 0, correct_attempts: 0, accuracy_pct: 0, avg_time_ms: 0 };

  return {
    total_attempts: Number(row.total_attempts ?? 0),
    correct_attempts: Number(row.correct_attempts ?? 0),
    accuracy_pct: Number(row.accuracy_pct ?? 0),
    avg_time_ms: Number(row.avg_time_ms ?? 0),
  };
}
