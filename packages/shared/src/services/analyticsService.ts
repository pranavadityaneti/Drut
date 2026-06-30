import { supabase } from '../lib/supabase';
import { AnalyticsRow } from '../types';

export type TopicProficiency = {
  topic: string;
  accuracy: number;
  total_attempts: number;
};

export type LearningVelocity = {
  day: string;
  questions_answered: number;
  accuracy: number;
};

export type SprintPerformance = {
  session_id: string;
  avg_time_ms: number;
  accuracy: number;
  total_questions: number;
};

export type WeakestSubtopic = {
  subtopic: string;
  topic: string;
  accuracy: number;
  attempts: number;
};

export type ActivityHeatmap = {
  day: string;
  count: number;
};

export type DistractorData = {
  subtopic: string;
  wrong_answer_text: string;
  choice_count: number;
};

export type StaminaPoint = {
  question_index: number;
  time_taken_ms: number;
  is_correct: boolean;
};

const EMPTY_ANALYTICS: AnalyticsRow = { total_attempts: 0, correct_attempts: 0, accuracy_pct: 0, avg_time_ms: 0 };

export async function fetchUserAnalytics(): Promise<AnalyticsRow> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return EMPTY_ANALYTICS;

  // Resilient like the other fetchers: NEVER throw. This runs inside the
  // dashboard's Promise.all — if it threw (e.g. the RPC is missing), it would
  // blank EVERY stat card, not just this one. Return zeros on any error instead.
  const { data, error } = await supabase.rpc('get_user_analytics');
  if (error) { console.error('fetchUserAnalytics error', error); return EMPTY_ANALYTICS; }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return EMPTY_ANALYTICS;

  return {
    total_attempts: Number(row.total_attempts ?? 0),
    correct_attempts: Number(row.correct_attempts ?? 0),
    accuracy_pct: Number(row.accuracy_pct ?? 0),
    avg_time_ms: Number(row.avg_time_ms ?? 0),
  };
}

export async function fetchTopicProficiency(): Promise<TopicProficiency[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.rpc('get_topic_proficiency', { p_user_id: session.user.id });
  if (error) { console.error("fetchTopicProficiency error", error); return []; }
  return data || [];
}

export async function fetchLearningVelocity(days: number = 30): Promise<LearningVelocity[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.rpc('get_learning_velocity', { p_user_id: session.user.id, p_days: days });
  if (error) { console.error("fetchLearningVelocity error", error); return []; }
  return data || [];
}

export async function fetchSprintPerformance(): Promise<SprintPerformance[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.rpc('get_sprint_performance', { p_user_id: session.user.id });
  if (error) { console.error("fetchSprintPerformance error", error); return []; }
  return data || [];
}

export async function fetchWeakestSubtopics(limit: number = 3): Promise<WeakestSubtopic[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.rpc('get_weakest_subtopics', { p_user_id: session.user.id, p_limit: limit });
  if (error) { console.error("fetchWeakestSubtopics error", error); return []; }
  return data || [];
}

export async function fetchActivityHeatmap(): Promise<ActivityHeatmap[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.rpc('get_activity_heatmap', { p_user_id: session.user.id });
  if (error) { console.error("fetchActivityHeatmap error", error); return []; }
  return data || [];
}

export async function fetchDistractorAnalysis(): Promise<DistractorData[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.rpc('get_distractor_analysis', { p_user_id: session.user.id });
  if (error) { console.error("fetchDistractorAnalysis error", error); return []; }
  return data || [];
}

export async function fetchStaminaCurve(): Promise<StaminaPoint[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase.rpc('get_stamina_curve', { p_user_id: session.user.id });
  if (error) { console.error("fetchStaminaCurve error", error); return []; }
  return data || [];
}

export async function fetchSubtopicStats(subtopic: string): Promise<{ total_attempts: number; accuracy: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { total_attempts: 0, accuracy: 0 };
  const { data, error } = await supabase.rpc('get_subtopic_stats', { p_user_id: session.user.id, p_subtopic: subtopic });
  if (error) { console.error("fetchSubtopicStats error", error); return { total_attempts: 0, accuracy: 0 }; }
  return data?.[0] || { total_attempts: 0, accuracy: 0 };
}

export async function fetchUserStreak(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return 0;
  const { data, error } = await supabase.rpc('get_user_streak', { p_user_id: session.user.id });
  if (error) { console.error("fetchUserStreak error", error); return 0; }
  return Number(data || 0);
}

/**
 * 7-day rolling accuracy + week-over-week delta. Queries user_question_history
 * for the last 14 days and bisects at the 7-day mark — current 7d window vs
 * the prior 7d window. Returns 0s when there's no data (no division-by-zero).
 */
export async function fetchWeeklyAccuracy(): Promise<{
  thisWeek: { attempted: number; correct: number; accuracy: number };
  lastWeek: { attempted: number; correct: number; accuracy: number };
  deltaPct: number; // this - last, in percentage points
}> {
  const empty = { attempted: 0, correct: 0, accuracy: 0 };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { thisWeek: empty, lastWeek: empty, deltaPct: 0 };

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('user_question_history')
    .select('was_correct, seen_at')
    .eq('user_id', session.user.id)
    .gte('seen_at', since);
  if (error) { console.error('fetchWeeklyAccuracy error', error); return { thisWeek: empty, lastWeek: empty, deltaPct: 0 }; }

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = { attempted: 0, correct: 0, accuracy: 0 };
  const lastWeek = { attempted: 0, correct: 0, accuracy: 0 };
  for (const row of (data || []) as Array<{ was_correct: boolean; seen_at: string }>) {
    const t = new Date(row.seen_at).getTime();
    const bucket = t >= cutoff ? thisWeek : lastWeek;
    bucket.attempted += 1;
    if (row.was_correct) bucket.correct += 1;
  }
  thisWeek.accuracy = thisWeek.attempted ? Math.round((thisWeek.correct / thisWeek.attempted) * 100) : 0;
  lastWeek.accuracy = lastWeek.attempted ? Math.round((lastWeek.correct / lastWeek.attempted) * 100) : 0;
  return { thisWeek, lastWeek, deltaPct: thisWeek.accuracy - lastWeek.accuracy };
}

/**
 * Daily question counts for the last 7 days (oldest -> today, length always 7).
 * Used for the home-screen sparkline.
 */
export async function fetchDailyCountsLast7Days(): Promise<number[]> {
  const out = new Array(7).fill(0);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return out;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6); // include today => 7 buckets
  const sinceIso = since.toISOString();

  const { data, error } = await supabase
    .from('user_question_history')
    .select('seen_at')
    .eq('user_id', session.user.id)
    .gte('seen_at', sinceIso);
  if (error) { console.error('fetchDailyCountsLast7Days error', error); return out; }

  for (const row of (data || []) as Array<{ seen_at: string }>) {
    const d = new Date(row.seen_at);
    d.setHours(0, 0, 0, 0);
    const dayIndex = Math.round((d.getTime() - since.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < 7) out[dayIndex] += 1;
  }
  return out;
}

export async function fetchPatternMasteryStats(): Promise<{ verified_count: number; learning_count: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { verified_count: 0, learning_count: 0 };

  const { data, error } = await supabase.rpc('get_pattern_mastery_stats', { p_user_id: session.user.id });
  if (error) { console.error("fetchPatternMasteryStats error", error); return { verified_count: 0, learning_count: 0 }; }

  return data?.[0] ? {
    verified_count: Number(data[0].verified_count),
    learning_count: Number(data[0].learning_count)
  } : { verified_count: 0, learning_count: 0 };
}
