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

const FALLBACK_QUESTIONS: QuestionItem[] = [
    {
        questionText: "Which number replaces the question mark? 2, 6, 12, 20, ?",
        options: [{ text: "30" }, { text: "42" }, { text: "28" }, { text: "24" }],
        correctOptionIndex: 0,
        timeTargets: { jee_main: 30, cat: 45, eamcet: 20 },
        theOptimalPath: {
            exists: true,
            steps: ["Calculate differences: 6-2=4, 12-6=6, 20-12=8.", "Pattern is +4, +6, +8.", "Next difference is +10.", "20 + 10 = 30."],
            sanityCheck: "Sequence of n(n+1): 1*2, 2*3, 3*4, 4*5, so 5*6=30."
        },
        fullStepByStep: { steps: ["Identify difference series.", "Add next difference."] }
    } as any,
    {
        questionText: "If A is 40% more than B, by what % is B less than A?",
        options: [{ text: "28.57%" }, { text: "40%" }, { text: "33.33%" }, { text: "25%" }],
        correctOptionIndex: 0,
        timeTargets: { jee_main: 40, cat: 60, eamcet: 30 },
        theOptimalPath: {
            exists: true,
            steps: ["Use formula: R / (100+R) * 100.", "40 / 140 * 100 = 2/7 * 100.", "1/7 is 14.28%, so 2/7 is 28.56%."],
            sanityCheck: "40 is less than 50% but more than 25%."
        },
        fullStepByStep: { steps: ["Assume B=100.", "A=140.", "Difference=40.", "% Less = 40/140 * 100."] }
    } as any,
    {
        questionText: "Speed ratio is 3:4. Time ratio to cover same distance is?",
        options: [{ text: "3:4" }, { text: "4:3" }, { text: "1:1" }, { text: "9:16" }],
        correctOptionIndex: 1,
        timeTargets: { jee_main: 10, cat: 15, eamcet: 10 },
        theOptimalPath: {
            exists: true,
            steps: ["Speed and Time are inversely proportional.", "Inverse of 3:4 is 4:3."],
            sanityCheck: "Faster speed takes less time."
        },
        fullStepByStep: { steps: ["S = D/T.", "Ratio T1/T2 = S2/S1."] }
    } as any
];

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
        console.warn('Falling back to local backup questions due to AI service failure.');
        // Return fallback questions so the user is not blocked
        return FALLBACK_QUESTIONS.slice(0, count);
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
