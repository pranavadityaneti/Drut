import { supabase } from '../lib/supabase';

export type AnalyticsRow = {
  total_attempts: number;
  correct_attempts: number;
  accuracy_pct: number;
  avg_time_ms: number;
};

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
