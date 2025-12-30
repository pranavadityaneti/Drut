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
    // Physics fallback: Inclined plane with friction
    {
        questionText: "A block of mass 2 kg is placed on an inclined plane that makes an angle of 30° with the horizontal. If the coefficient of kinetic friction is 0.2, what is the acceleration of the block down the incline? (Take g = 10 m/s²)",
        options: [{ text: "3.27 m/s²" }, { text: "5.0 m/s²" }, { text: "1.73 m/s²" }, { text: "6.67 m/s²" }],
        correctOptionIndex: 0,
        timeTargets: { jee_main: 180, cat: 120, eamcet: 150 },
        theOptimalPath: {
            exists: true,
            steps: ["a = g(sinθ - μcosθ)", "a = 10(sin30° - 0.2×cos30°)", "a = 10(0.5 - 0.2×0.866)", "a = 10(0.5 - 0.173) = 3.27 m/s²"],
            sanityCheck: "Friction reduces acceleration below g×sinθ = 5 m/s²"
        },
        fullStepByStep: { steps: ["Draw FBD.", "Forces: mg sinθ down, friction up.", "a = g(sinθ - μcosθ) = 3.27 m/s²"] },
        fsmTag: "pulleys-inclined-planes",
        diagramRequired: true,
        visualDescription: "Schematic physics diagram. White background. Inclined plane at 30° to horizontal. Block of mass 2kg on the plane. Rough surface labeled μ=0.2. Ground line. Angle marked. Line art style. 4:3 aspect ratio."
    } as any,
    // Physics fallback: Atwood machine
    {
        questionText: "Two blocks of masses 3 kg and 5 kg are connected by a light inextensible string passing over a frictionless pulley. What is the acceleration of the system? (Take g = 10 m/s²)",
        options: [{ text: "2.5 m/s²" }, { text: "5.0 m/s²" }, { text: "1.25 m/s²" }, { text: "3.75 m/s²" }],
        correctOptionIndex: 0,
        timeTargets: { jee_main: 120, cat: 90, eamcet: 100 },
        theOptimalPath: {
            exists: true,
            steps: ["For Atwood machine: a = g(m2-m1)/(m1+m2)", "a = 10(5-3)/(3+5)", "a = 10(2)/8 = 2.5 m/s²"],
            sanityCheck: "Acceleration is less than g and proportional to mass difference"
        },
        fullStepByStep: { steps: ["Net force = (m2-m1)g", "Total mass = m1+m2", "a = Net force / Total mass"] },
        fsmTag: "pulleys-inclined-planes",
        diagramRequired: true,
        visualDescription: "Schematic physics diagram. White background. Frictionless pulley at top. Two masses hanging: 3kg on left, 5kg on right. String connecting them. Labels for masses. Line art style. 4:3 aspect ratio."
    } as any,
    // Physics fallback: Smooth inclined plane
    {
        questionText: "A block of mass 4 kg is placed on a smooth inclined plane that makes an angle of 45° with the horizontal. What is the acceleration of the block down the incline? (Take g = 10 m/s²)",
        options: [{ text: "7.07 m/s²" }, { text: "10 m/s²" }, { text: "5 m/s²" }, { text: "3.54 m/s²" }],
        correctOptionIndex: 0,
        timeTargets: { jee_main: 90, cat: 60, eamcet: 75 },
        theOptimalPath: {
            exists: true,
            steps: ["For smooth incline: a = g sinθ", "a = 10 × sin45°", "a = 10 × (1/√2) = 7.07 m/s²"],
            sanityCheck: "At 45°, acceleration is g/√2 ≈ 7.07"
        },
        fullStepByStep: { steps: ["No friction on smooth surface.", "Component of gravity along incline = mg sinθ.", "a = g sinθ = 7.07 m/s²"] },
        fsmTag: "pulleys-inclined-planes",
        diagramRequired: true,
        visualDescription: "Schematic physics diagram. White background. Smooth inclined plane at 45° to horizontal. Block of mass 4kg on the plane. Smooth surface notation. Angle marked. Line art style. 4:3 aspect ratio."
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
