import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';
import { AnalyticsRow } from '../types';

const ZERO: AnalyticsRow = { total_attempts: 0, accuracy: 0, avg_time_ms: 0 };

export async function fetchUserAnalytics(): Promise<AnalyticsRow> {
  const supabase = getSupabase();
  if (!supabase) {
      log.error('[analytics] Supabase client not available.');
      throw new Error("Analytics service not available.");
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    log.error('[analytics] no user/session', userErr ?? 'no user');
    throw new Error('Not authenticated');
  }

  try {
    const { data, error } = await supabase.rpc('drut_get_user_analytics_v1', {
      p_user_id: userData.user.id,
    });

    if (error) {
      // Throw to be caught by the catch block, which will trigger the client-side fallback.
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return ZERO;
    }
    return {
      total_attempts: Number(row.total_attempts ?? 0),
      accuracy: Number(row.accuracy ?? 0),
      avg_time_ms: Number(row.avg_time_ms ?? 0),
    };

  } catch (rpcError: any) {
    log.warn('[analytics] RPC failed, attempting client-side fallback.', JSON.stringify(rpcError, null, 2));

    // --- Client-side Fallback Logic ---
    const { data: rows, error: fallbackError } = await supabase
      .from('performance_records')
      .select('is_correct,time_ms')
      .eq('user_id', userData.user.id);

    if (fallbackError) {
      log.error('[analytics] Client-side fallback failed.', JSON.stringify(fallbackError, null, 2));
      throw new Error(`Could not load Performance Analytics: ${fallbackError.message}`);
    }

    if (!rows || rows.length === 0) {
        return ZERO;
    }

    const total = rows.length;
    const correctCount = rows.filter(r => r.is_correct).length;
    const totalTime = rows.reduce((sum, r) => sum + (r.time_ms || 0), 0);
    const accuracy = total > 0 ? correctCount / total : 0;
    const avg_time_ms = total > 0 ? totalTime / total : 0;

    return {
      total_attempts: total,
      accuracy: accuracy,
      avg_time_ms: avg_time_ms,
    };
  }
}