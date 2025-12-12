import { supabase } from '../lib/supabase';
import { QuestionData } from '../types';

export async function savePerformance(
  isCorrect: boolean,
  qid: string,
  timeMs: number,
  selectedOptionIndex?: number
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const params = {
    is_correct: isCorrect,
    question_id: qid,
    time_ms: timeMs,
    selected_option_index: selectedOptionIndex,
  };

  const { data, error } = await supabase.rpc('log_performance_v1', {
    p_params: params,
  });

  if (error) throw error;
  return data;
}

export interface MasteryResult {
  new_streak: number;
  new_mastery_level: 'novice' | 'learning' | 'verified';
  is_now_in_debt: boolean;
}

/**
 * Save attempt and update pattern mastery in one transaction
 * Used by the Mastery Loop for streak/debt tracking
 */
export async function saveAttemptAndUpdateMastery(params: {
  questionUuid: string;
  fsmTag: string;
  isCorrect: boolean;
  timeMs: number;
  targetTimeMs: number;
  selectedOptionIndex: number;
  skipDrill?: boolean;
}): Promise<MasteryResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('save_attempt_and_update_mastery', {
    p_user_id: session.user.id,
    p_question_uuid: params.questionUuid,
    p_fsm_tag: params.fsmTag,
    p_is_correct: params.isCorrect,
    p_time_ms: params.timeMs,
    p_target_time_ms: params.targetTimeMs,
    p_selected_option_index: params.selectedOptionIndex,
    p_skip_drill: params.skipDrill ?? false,
  });

  if (error) throw error;

  // RPC returns array, take first result
  const result = Array.isArray(data) ? data[0] : data;
  return result as MasteryResult;
}

/**
 * Get a question with the same FSM tag for "Prove It" flow
 */
export async function getQuestionByFsmTag(
  fsmTag: string,
  excludeQuestionId?: string
): Promise<QuestionData | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_question_by_fsm_tag', {
    p_user_id: session.user.id,
    p_fsm_tag: fsmTag,
    p_exclude_question_id: excludeQuestionId ?? null,
  });

  if (error) throw error;

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  // Parse question_data from cached_questions row
  const row = Array.isArray(data) ? data[0] : data;
  return row.question_data as QuestionData;
}

// ============================================================
// DEV MODE HELPERS
// ============================================================

/**
 * Dev Mode: Fetch the latest manually ingested questions
 * Useful for testing the Mastery Loop with known "Golden Standard" questions
 */
export async function getLatestQuestions(limit: number = 5): Promise<QuestionData[]> {
  const { data, error } = await supabase.rpc('get_latest_questions', {
    p_limit: limit,
  });

  if (error) {
    console.error('[dev] Failed to fetch latest questions:', error);
    return [];
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return [];
  }

  // Map to QuestionData format
  return (data as any[]).map(row => {
    const qd = row.question_data as QuestionData;
    return {
      ...qd,
      uuid: row.id,
      fsmTag: row.fsm_tag || qd.fsmTag || 'unknown',
    };
  });
}

/**
 * Check if we're in dev mode
 * Set via localStorage for easy toggling
 */
export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('drut_dev_mode') === 'true';
}

/**
 * Toggle dev mode
 */
export function setDevMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('drut_dev_mode', enabled ? 'true' : 'false');
  console.log(`[dev] Dev mode ${enabled ? 'enabled' : 'disabled'}`);
}
