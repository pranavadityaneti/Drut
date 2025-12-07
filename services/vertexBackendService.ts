// Frontend service to call Supabase Edge Functions for Vertex AI question generation
import { supabase } from '../lib/supabase';
import { QuestionItem } from '../lib/ai/schema';
import { log } from '../lib/log';

/**
 * Generate a single question using Vertex AI via Supabase Edge Function
 */
export async function generateOneQuestion(
    topic: string,
    subTopic: string,
    examProfile: string,
    difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<QuestionItem> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-question', {
            body: {
                topic,
                subtopic: subTopic,
                examProfile,
                difficulty,
            },
        });

        if (error) {
            log.error('[vertex] Edge function error:', error);
            throw new Error(error.message || 'Failed to generate question');
        }

        if (!data || !data.question) {
            throw new Error('Invalid response from Edge Function');
        }

        return data.question as QuestionItem;
    } catch (error: any) {
        log.error('[vertex] Generate question failed:', error);
        throw error;
    }
}

/**
 * Generate multiple questions using Vertex AI via Supabase Edge Function
 */
export async function generateQuestionsBatch(
    topic: string,
    subTopic: string,
    examProfile: string,
    count: number,
    difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<QuestionItem[]> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-batch', {
            body: {
                topic,
                subtopic: subTopic,
                examProfile,
                difficulty,
                count: Math.min(count, 10), // Limit to 10 per batch
            },
        });

        if (error) {
            log.error('[vertex] Batch generation error:', error);
            throw new Error(error.message || 'Failed to generate batch');
        }

        if (!data || !data.questions || !Array.isArray(data.questions)) {
            throw new Error('Invalid response from Edge Function');
        }

        return data.questions as QuestionItem[];
    } catch (error: any) {
        log.error('[vertex] Batch generation failed:', error);
        throw error;
    }
}

/**
 * Generate AI-powered study tips using Vertex AI via Supabase Edge Function
 */
export async function generateAITips(performanceData: {
    totalAttempts: number;
    accuracy: number;
    avgTimeMs: number;
    weakestSubtopics: Array<{ subtopic: string; accuracy: number }>;
    distractors: Array<{ subtopic: string; wrong_answer_text: string; choice_count: number }>;
}): Promise<string[]> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-tips', {
            body: {
                performanceData,
            },
        });

        if (error) {
            log.error('[vertex] Tips generation error:', error);
            throw new Error(error.message || 'Failed to generate tips');
        }

        if (!data || !data.tips || !Array.isArray(data.tips)) {
            throw new Error('Invalid response from Edge Function');
        }

        return data.tips as string[];
    } catch (error: any) {
        log.error('[vertex] Tips generation failed:', error);
        // Return fallback tips
        return [
            performanceData.accuracy < 70 ? "Focus on understanding concepts before speed" : "Maintain your strong accuracy!",
            performanceData.weakestSubtopics[0] ? `Practice more ${performanceData.weakestSubtopics[0].subtopic} questions` : "Review your mistakes",
            performanceData.avgTimeMs > 60000 ? "Work on faster problem-solving" : "Keep up your good pace!",
            "Take notes on concepts you get wrong"
        ];
    }
}

// Export for backward compatibility
export const generateQuestionAndSolutions = generateOneQuestion;
export const generateBatch = async (
    topic: string,
    subTopic: string,
    examProfile: string,
    count: number,
    difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<{ success: QuestionItem[], failed: number }> => {
    try {
        const questions = await generateQuestionsBatch(topic, subTopic, examProfile, count, difficulty);
        return { success: questions, failed: count - questions.length };
    } catch (error) {
        return { success: [], failed: count };
    }
};
