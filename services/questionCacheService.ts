import { supabase } from '../lib/supabase';
import { QuestionItem } from '../lib/ai/schema';
import { generateOneQuestion } from './geminiService';
import { log } from '../lib/log';

export interface CachedQuestion {
  id: string;
  question_id: string;
  exam_profile: string;
  topic: string;
  subtopic: string;
  question_data: QuestionItem;
  generated_at: string;
  times_served: number;
  last_served_at?: string;
}

export interface CacheStats {
  total_cached: number;
  avg_times_served: number;
  oldest_question: string;
  newest_question: string;
}

/**
 * Get questions for a user, ensuring no repetition
 * Uses cached questions when available, generates new ones when needed
 */
export async function getQuestionsForUser(
  userId: string,
  examProfile: string,
  topic: string,
  subtopic: string,
  count: number = 5,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<{ questions: QuestionItem[]; metadata: { cached: number; generated: number } }> {
  console.log('[DEBUG] getQuestionsForUser called:', { userId, examProfile, topic, subtopic, count });
  const metadata = { cached: 0, generated: 0 };
  const questions: QuestionItem[] = [];

  try {
    console.log('[DEBUG] Step 1: Checking cache...');
    // Step 1: Try to get unseen cached questions for this user
    const { data: unseenQuestions, error: cacheError } = await supabase
      .rpc('get_unseen_questions', {
        p_user_id: userId,
        p_exam: examProfile,
        p_topic: topic,
        p_subtopic: subtopic,
        p_difficulty: difficulty,
        p_count: count,
      });

    if (cacheError) {
      console.error('[DEBUG] Cache error:', cacheError);
      log.warn('[cache] Error fetching unseen questions:', cacheError);
    }

    // Step 2: Use cached questions if available
    if (unseenQuestions && unseenQuestions.length > 0) {
      console.log(`[DEBUG] Found ${unseenQuestions.length} cached questions`);
      log.info(`[cache] Found ${unseenQuestions.length} unseen cached questions`);
      metadata.cached = unseenQuestions.length;

      const cachedQs = unseenQuestions.map((cq: CachedQuestion) => cq.question_data);
      questions.push(...cachedQs);

      // Mark these questions as seen by this user
      const questionIds = unseenQuestions.map((cq: CachedQuestion) => cq.id);
      await markQuestionsSeen(userId, questionIds);
    }

    // Step 3: Generate additional questions if needed
    const needed = count - questions.length;
    console.log(`[DEBUG] Need to generate ${needed} questions`);

    if (needed > 0) {
      log.info(`[cache] Need to generate ${needed} new questions`);

      for (let i = 0; i < needed; i++) {
        try {
          console.log(`[DEBUG] Generating question ${i + 1}/${needed}...`);

          // Generate new question
          const newQuestion = await generateOneQuestion(topic, subtopic, examProfile, difficulty);
          console.log(`[DEBUG] Question ${i + 1} generated successfully`);

          // Save to cache
          const cachedId = await cacheQuestion(
            userId,
            examProfile,
            topic,
            subtopic,
            newQuestion,
            difficulty
          );

          // Add to results
          questions.push(newQuestion);
          metadata.generated++;

          // Mark as seen by this user immediately
          if (cachedId) {
            await markQuestionsSeen(userId, [cachedId]);
          }

          // Rate limiting: small delay between generations
          if (i < needed - 1) {
            await delay(1000); // 1 second between questions
          }
        } catch (err: any) {
          console.error(`[DEBUG] Generation ${i + 1} failed:`, err);
          log.error('[cache] Generation failed:', err.message);

          // If quota exceeded, stop trying and return what we have
          if (err.message?.includes('QUOTA_EXCEEDED') ||
            err.message?.includes('429') ||
            err.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn('[DEBUG] Quota exceeded, stopping generation');
            log.warn('[cache] Quota exceeded, returning partial results');
            break;
          }

          // Re-throw other errors to stop the loop
          throw err;
        }
      }
    }

    console.log(`[DEBUG] Returning ${questions.length} total questions`);
    log.info(`[cache] Returning ${questions.length} questions (${metadata.cached} cached, ${metadata.generated} generated)`);
    return { questions, metadata };

  } catch (error: any) {
    console.error('[DEBUG] Fatal error in getQuestionsForUser:', error);
    log.error('[cache] Failed to get questions:', error);
    throw new Error(`Failed to load questions: ${error.message}`);
  }
}

/**
 * Cache a generated question
 */
async function cacheQuestion(
  userId: string,
  examProfile: string,
  topic: string,
  subtopic: string,
  question: QuestionItem,
  difficulty: 'Easy' | 'Medium' | 'Hard'
): Promise<string | null> {
  const questionId = `${examProfile}_${topic}_${subtopic}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { data, error } = await supabase
      .from('cached_questions')
      .insert({
        question_id: questionId,
        exam_profile: examProfile,
        topic: topic,
        subtopic: subtopic,
        question_data: question,
        difficulty: difficulty,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) {
      log.warn('[cache] Failed to cache question:', error);
      return null;
    }

    log.info(`[cache] Cached question ${questionId}`);
    return data?.id || null;
  } catch (error) {
    log.warn('[cache] Exception caching question:', error);
    return null;
  }
}

/**
 * Mark questions as seen by a user
 */
async function markQuestionsSeen(userId: string, questionIds: string[]): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('mark_questions_seen', {
      p_user_id: userId,
      p_question_ids: questionIds,
    });

    if (error) {
      log.warn('[cache] Failed to mark questions as seen:', error);
      return;
    }

    log.info(`[cache] Marked ${data || questionIds.length} questions as seen for user`);
  } catch (error) {
    log.warn('[cache] Exception marking questions seen:', error);
  }
}

/**
 * Get cache statistics for a topic
 */
export async function getCacheStats(
  examProfile: string,
  topic: string,
  subtopic: string,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<CacheStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_cache_stats', {
      p_exam: examProfile,
      p_topic: topic,
      p_subtopic: subtopic,
      p_difficulty: difficulty,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0] as CacheStats;
  } catch (error) {
    log.warn('[cache] Failed to get cache stats:', error);
    return null;
  }
}

/**
 * Get user's question history statistics
 */
export async function getUserQuestionStats(userId: string): Promise<{
  total_seen: number;
  unique_topics: number;
  last_practice: string | null;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_question_stats', {
      p_user_id: userId,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    log.warn('[cache] Failed to get user stats:', error);
    return null;
  }
}

/**
 * Check how many unseen questions are available for a user
 */
export async function getUnseenQuestionCount(
  userId: string,
  examProfile: string,
  topic: string,
  subtopic: string,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_unseen_questions', {
        p_user_id: userId,
        p_exam: examProfile,
        p_topic: topic,
        p_subtopic: subtopic,
        p_difficulty: difficulty,
        p_count: 1000, // Large number to get count
      });

    if (error) {
      log.warn('[cache] Error counting unseen questions:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    log.warn('[cache] Exception counting unseen questions:', error);
    return 0;
  }
}

/**
 * Utility delay function
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
