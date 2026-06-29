import { supabase } from '../lib/supabase';
import { QuestionItem } from '../lib/ai/schema';
import { QuestionData } from '../types';
import { generateQuestionsBatch } from './vertexBackendService';
import { log } from '../lib/log';
import { getRemainingFreeQuota, isPaywallError, PaywallError } from './paymentService';
import { FREE_DAILY_QUESTION_LIMIT } from '../lib/pricing';

/**
 * Feature flag — gates live AI question generation.
 *
 * Set to `false` during beta to prevent ungrounded Gemini output reaching users.
 * Flip to `true` once textbooks are ingested (RAG retrieval will then ground
 * generated questions in NCERT content via the generate-batch edge function).
 *
 * When false: cache misses surface as "No questions available" instead of
 * falling back to unverified AI.
 */
export const ALLOW_LIVE_AI_FALLBACK = false;

export interface CachedQuestion {
  id: string;
  question_id: string;
  exam_profile: string;
  topic: string;
  subtopic: string;
  question_data: QuestionItem;
  fsm_tag: string | null;
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
 * THE single serving gate for practice questions — used by BOTH web and mobile so
 * the two platforms always draw from the identical pool (they previously diverged:
 * web served only `ai-openai-audited` ~13 Qs; mobile also trusted `v3-verified-rag`
 * and served ~5,500 OLD-format legacy with banned framework labels).
 *
 * A question is servable IFF:
 *   1. it is in the NEW "B+C mix" format (has BOTH quickMethod AND fullSolution) — this
 *      excludes every old-format legacy row (theOptimalPath/fullStepByStep-only:
 *      v3-verified-rag, v3-unverified-ai, null) that carries the banned labels; AND
 *   2. its verification_status is an approved / curated source (allowlist) — this
 *      excludes new-format-but-unapproved rows (ai-openai-staged / -rejected).
 *
 * NOTE: gate (1) is the hard label-leak guard — only NEW-format rows (quickMethod +
 * fullSolution) ever serve, so legacy-format admin-imported rows stay excluded even
 * though their status is on the allowlist below; they must be re-generated in the new
 * format to serve. Gate (2) decides WHICH trusted sources may serve once they ARE
 * new-format. (Previously this list omitted admin-verified/manual-curated, so a
 * new-format admin-imported question was silently unservable; and the old doc-comment
 * claimed a 2-entry set while the array had 4 — both reconciled here.)
 */
const SERVABLE_STATUS_SUBSTRINGS = [
  'ai-openai-audited',   // generated + admin-approved
  'v3-verified-pyq',     // enriched past-paper questions
  'admin-verified',      // admin Bulk Import (serves only if ALSO new-format — gate 1)
  'manual-curated',      // manually curated (serves only if ALSO new-format — gate 1)
  '2.6',                 // legacy version tag, back-compat (fragile substring — revisit)
  'SubjectFallback',     // legacy fallback tag, back-compat
];

export function isServableQuestion(q: any): boolean {
  if (!q) return false;
  // (1) new-format gate — the hard exclusion of old-format legacy.
  if (!q.quickMethod || !q.fullSolution) return false;
  // (2) approved-source gate.
  const status = String(q.verification_status || '');
  return SERVABLE_STATUS_SUBSTRINGS.some(s => status.includes(s));
}

/**
 * Map a cached_questions row (from the get_unseen_questions RPC OR a direct
 * select) to the QuestionData shape the renderers expect.
 *
 * CRITICAL: carries the new "B+C mix" fields (quickMethod/fullSolution) alongside
 * the legacy fields, so both formats render. Without quickMethod/fullSolution the
 * UI falls back to the legacy "optimal path" and shows "No optimal path available".
 * Trust signals come from the top-level columns, with the JSONB as a fallback for
 * older rows. Shared by the unseen path and the review-seen fallback.
 */
export function mapCachedToQuestionData(
  cq: any,
  subtopic: string,
  fallbackDifficulty: 'Easy' | 'Medium' | 'Hard'
): QuestionData {
  const qd = (cq.question_data || {}) as unknown as QuestionData;
  const result: any = {
    uuid: cq.id,
    fsmTag: cq.fsm_tag || `${subtopic}-legacy`,
    questionText: qd.questionText,
    options: qd.options,
    correctOptionIndex: qd.correctOptionIndex,
    timeTargets: qd.timeTargets,
    theOptimalPath: (qd as any).theOptimalPath || (qd as any).fastestSafeMethod,
    fullStepByStep: qd.fullStepByStep,
    quickMethod: (qd as any).quickMethod,
    fullSolution: (qd as any).fullSolution,
    concepts: (qd as any).concepts,
    distractorRationale: (qd as any).distractorRationale,
    visualDescription: (qd as any).visualDescription || undefined,
    diagramUrl: (qd as any).diagramUrl || undefined,
    diagramRequired: (qd as any).diagramRequired || false,
    difficulty: (qd as any).difficulty || fallbackDifficulty,
    verification_status: cq.verification_status || (qd as any).verification_status,
    source_type: cq.source_type || (qd as any).source_type,
  };
  return result;
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
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium',
  classLevel?: string,
  board?: string,
  subject?: string,
  language?: 'English' | 'Telugu' | 'Hindi'
): Promise<{ questions: QuestionData[]; metadata: { cached: number; generated: number } }> {
  console.log('[DEBUG] getQuestionsForUser called:', { userId, examProfile, topic, subtopic, count, classLevel, board, subject, language });
  const metadata = { cached: 0, generated: 0 };
  const questions: QuestionData[] = [];

  // EAPCET SERVING CONSOLIDATION — the new-format APPROVED question pool lives entirely
  // under exam_profile='ap_eapcet'. ts_eapcet + legacy 'eamcet'/'both'/'eapcet' have ~0
  // servable rows but share an ~identical EAPCET syllabus, so map them onto the
  // ap_eapcet pool — otherwise every Telangana and legacy-profile user gets ZERO
  // questions even though thousands exist. (Non-EAPCET exams are untouched.)
  if (examProfile === 'ts_eapcet' || examProfile === 'eamcet' || examProfile === 'both' || examProfile === 'eapcet') {
    examProfile = 'ap_eapcet';
  }

  // FREE-TIER GATE + BATCH CAP — single chokepoint for web + mobile, practice + sprint.
  // Pro users pass through (Infinity remaining). Free users are capped to whatever
  // they have left today, so a single gate check can NEVER be used to over-fetch a
  // batch (e.g. a 30-question sprint started at 19/20 used). Throws PaywallError when
  // nothing remains. Placed BEFORE the try so it propagates untouched; the catch below
  // also re-throws PaywallError defensively in case this ever moves inside the try.
  const remainingQuota = await getRemainingFreeQuota();
  if (remainingQuota <= 0) {
    throw new PaywallError(
      `You've reached your ${FREE_DAILY_QUESTION_LIMIT} free questions for today. Upgrade to Drut Pro for unlimited practice.`,
    );
  }
  if (Number.isFinite(remainingQuota)) {
    count = Math.min(count, Math.floor(remainingQuota));
  }

  try {
    console.log('[DEBUG] Step 1: Checking cache...');

    // Step 1: Cache Check
    // NOTE: We do NOT filter cache by language yet (assuming English cache is okay or we clear cache)
    // To support multi-lingual cache, 'get_unseen_questions' RPC needs update, OR we assume cache is mixed
    // For now, let's proceed. If language is NOT English, maybe skip cache?
    const skipCache = language && language !== 'English';
    let unseenQuestions: any[] | null = [];

    if (!skipCache) {
      // COUNT-ON-SERVE: serve via the metered serving RPC. It returns at most the
      // free user's remaining quota of unseen questions AND marks them seen AND
      // increments the daily count, atomically server-side. This is the only
      // client-callable serving path (get_unseen_questions execute is revoked), so a
      // free user can't exceed the daily cap by any means — app flow or raw API.
      const { data, error: cacheError } = await supabase
        .rpc('serve_unseen_questions', {
          p_user_id: userId,
          p_exam_profile: examProfile,
          p_topic: topic,
          p_subtopic: subtopic,
          p_difficulty: difficulty,
          p_limit: count,
          p_subject: subject ?? null,
        });

      if (cacheError) {
        console.error('[DEBUG] Cache error:', cacheError);
        log.warn('[cache] Error fetching unseen questions:', cacheError);
      } else {
        unseenQuestions = data;
      }
    } else {
      console.log(`[DEBUG] Skipping cache for language: ${language}`);
    }

    // Step 2: Use cached questions if available
    if (unseenQuestions && unseenQuestions.length > 0) {
      console.log(`[DEBUG] Found ${unseenQuestions.length} cached questions`);
      log.info(`[cache] Found ${unseenQuestions.length} unseen cached questions`);
      metadata.cached = unseenQuestions.length;

      // Map cached questions to QuestionData (carries new + legacy fields and the
      // trust signals). Shared with the review-seen fallback below.
      const cachedQs = unseenQuestions.map((cq: any) => mapCachedToQuestionData(cq, subtopic, difficulty));
      questions.push(...cachedQs);

      // NOTE: serve_unseen_questions already marked these seen + bumped serve stats
      // server-side (count-on-serve), so we deliberately do NOT call markQuestionsSeen
      // here — doing so would double-increment times_served.
    }

    // Step 3: Generate additional questions if needed
    const needed = count - questions.length;
    console.log(`[DEBUG] Need to generate ${needed} questions`);

    let generationError: Error | null = null;

    if (needed > 0 && !ALLOW_LIVE_AI_FALLBACK) {
      log.warn(`[cache] Cache short by ${needed} questions but ALLOW_LIVE_AI_FALLBACK is OFF — returning what we have.`);
    }

    if (needed > 0 && ALLOW_LIVE_AI_FALLBACK) {
      log.info(`[cache] Need to generate ${needed} new questions`);

      try {
        console.log(`[DEBUG] Generating batch of ${needed} questions...`);
        console.log('[DEBUG] Pre-Vertex Call Args:', {
          topic, subtopic, examProfile, needed, difficulty, classLevel, board, subject, language
        });

        // Generate batch - 1 API call
        const generatedBatch = await generateQuestionsBatch(
          topic,
          subtopic,
          examProfile,
          needed,
          difficulty,
          { classLevel, board, subject, language }
        );

        console.log(`[DEBUG] Batch generation successful. Got ${generatedBatch.length} questions.`);

        for (const newQuestion of generatedBatch) {
          // Save to cache and get the UUID back
          const cachedId = await cacheQuestion(
            userId,
            examProfile,
            topic,
            subtopic,
            newQuestion,
            difficulty
          );

          // Add to results with uuid and fsmTag
          const nq = newQuestion as unknown as QuestionData;
          const questionWithMeta: QuestionData = {
            uuid: cachedId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fsmTag: (newQuestion as any).fsmTag || `${subtopic}-generated`,
            questionText: nq.questionText,
            options: nq.options,
            correctOptionIndex: nq.correctOptionIndex,
            timeTargets: nq.timeTargets,
            theOptimalPath: (nq as any).theOptimalPath || (nq as any).fastestSafeMethod,
            fullStepByStep: nq.fullStepByStep,
            visualDescription: (newQuestion as any).visualDescription || undefined,
            diagramUrl: (newQuestion as any).diagramUrl || undefined,
            diagramRequired: (newQuestion as any).diagramRequired || false,
            difficulty: (newQuestion as any).difficulty || difficulty,
          };
          questions.push(questionWithMeta);
          metadata.generated++;

          // Mark as seen by this user immediately
          if (cachedId) {
            await markQuestionsSeen(userId, [cachedId]);
          }
        }

      } catch (err: any) {
        generationError = err;
        console.error(`[DEBUG] Batch generation failed:`, err);
        log.error('[cache] Batch generation failed:', err.message);

        // If quota exceeded, we can't do much else
        if (err.message?.includes('QUOTA_EXCEEDED') ||
          err.message?.includes('429') ||
          err.message?.includes('RESOURCE_EXHAUSTED')) {
          console.warn('[DEBUG] Quota exceeded during batch generation');
        }
      }
    }

    console.log(`[DEBUG] Returning ${questions.length} total questions`);
    log.info(`[cache] Returning ${questions.length} questions (${metadata.cached} cached, ${metadata.generated} generated)`);

    if (questions.length === 0) {
      log.error('[cache] Failed to load any questions');
      const msg = generationError ? generationError.message : 'No questions available. Please try again later.';
      throw new Error(msg);
    }

    return { questions, metadata };

  } catch (error: any) {
    // Never swallow the paywall signal into a generic load error — the UI needs
    // the PaywallError type to show the upgrade modal instead of an error toast.
    if (isPaywallError(error)) throw error;
    console.error('[DEBUG] Fatal error in getQuestionsForUser:', error);
    log.error('[cache] Failed to get questions:', error);
    throw new Error(`Failed to load questions: ${error.message}`);
  }
}

/**
 * REVIEW-SEEN fallback.
 *
 * When a user has exhausted the UNSEEN questions for a narrow filter, we re-serve
 * already-seen questions for the SAME filter instead of (a) generating new,
 * un-audited content or (b) hitting a dead end. This is the safe alternative to
 * the removed client-side "force generate" path: review content is always real,
 * already-stored questions — never live-generated.
 *
 * Returns candidate rows for the filter from cached_questions (read-only; does
 * NOT mark them seen — they are review). The CALLER applies its own trust filter
 * (web and mobile use different trusted-status sets) and de-dupes against the
 * questions already in the current batch. Returns [] on any error (never throws).
 */
export async function getReviewQuestionsForUser(
  examProfile: string,
  topic: string,
  subtopic: string,
  count: number = 5,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium',
  subject?: string
): Promise<{ questions: QuestionData[] }> {
  try {
    // Over-fetch candidates for this exact serving filter so the caller's trust
    // filter still leaves enough to fill the deficit (trust is enforced
    // client-side today). Mirrors the unseen path's filter: exam/topic/subtopic/
    // difficulty (+ subject when known).
    let query = supabase
      .from('cached_questions')
      .select('id, fsm_tag, question_data, verification_status, difficulty')
      .eq('exam_profile', examProfile)
      .eq('difficulty', difficulty)
      .limit(Math.max(count * 6, 30));
    // 'ALL' is the "any" sentinel (mirrors get_unseen_questions) — skip that filter.
    if (topic !== 'ALL') query = query.eq('topic', topic);
    if (subtopic !== 'ALL') query = query.eq('subtopic', subtopic);
    if (subject) query = query.eq('subject', subject);

    const { data, error } = await query;
    if (error) {
      log.warn('[review] Error fetching review questions:', error);
      return { questions: [] };
    }

    const rows = Array.isArray(data) ? [...data] : [];
    // Shuffle so review isn't always the same order.
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }

    const questions = rows.map((cq: any) => mapCachedToQuestionData(cq, subtopic, difficulty));
    log.info(`[review] Fetched ${questions.length} review candidates for ${topic}/${subtopic}/${difficulty}`);
    return { questions };
  } catch (err: any) {
    log.warn('[review] Exception fetching review questions:', err?.message);
    return { questions: [] };
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
        fsm_tag: question.fsmTag || null,
        difficulty: difficulty,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[DEBUG] Failed to cache question:', error);
      log.warn('[cache] Failed to cache question:', error);
      return null;
    }

    console.log(`[DEBUG] Cached question ${questionId} with DB ID ${data?.id}`);
    log.info(`[cache] Cached question ${questionId}`);
    return data?.id || null;
  } catch (error) {
    console.error('[DEBUG] Exception caching question:', error);
    log.warn('[cache] Exception caching question:', error);
    return null;
  }
}

/**
 * Mark questions as seen by a user
 */
async function markQuestionsSeen(userId: string, questionIds: string[]): Promise<void> {
  if (!questionIds || questionIds.length === 0) return;

  console.log(`[DEBUG] Marking ${questionIds.length} questions as seen for user ${userId}`);
  try {
    const { data, error } = await supabase.rpc('mark_questions_seen', {
      p_user_id: userId,
      p_question_ids: questionIds,
    });

    if (error) {
      console.error('[DEBUG] Failed to mark questions as seen:', error);
      log.warn('[cache] Failed to mark questions as seen:', error);
      return;
    }

    console.log(`[DEBUG] Successfully marked ${data} questions as seen`);
    log.info(`[cache] Marked ${data || questionIds.length} questions as seen for user`);
  } catch (error) {
    console.error('[DEBUG] Exception marking questions seen:', error);
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
