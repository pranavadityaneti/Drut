
import { QuestionSchema, type QuestionItem } from "../lib/ai/schema";
import { getAiClient } from "../lib/ai/vertexAiClient";
import { log } from '../lib/log';
import pLimit from 'p-limit';

// 1. Define the exact JSON shape as a hint string to pass to the AI.
const SCHEMA_HINT = `
{
  "questionText": string,
  "options": [
    { "text": string },
    { "text": string },
    { "text": string },
    { "text": string }
  ],
  "correctOptionIndex": 0 | 1 | 2 | 3,
  "timeTargets": { "jee_main": number, "cat": number, "eamcet": number },
  "fastestSafeMethod": {
    "exists": boolean,
    "preconditions": string,
    "steps": string[],
    "sanityCheck": string
  },
  "fullStepByStep": { "steps": string[] }
}
`.trim();

const SYSTEM_INSTRUCTION = `
You are an expert exam question generator for competitive exams like CAT, JEE Main, and EAMCET.

Your goal is to generate ONE practice question that strictly matches the following JSON schema:
${SCHEMA_HINT}

IMPORTANT RULES:
- Output ONLY valid JSON.
- Do NOT output Markdown code fences (e.g., \`\`\`json).
- "options" array MUST have exactly 4 items.
- "correctOptionIndex" MUST be an integer 0..3.
- "fastestSafeMethod" steps should be short and actionable.
- "fullStepByStep" should be detailed and didactic.
`.trim();

function buildUserPrompt(spec: {
  exam: string; topic: string; subtopic: string; difficulty: 'Easy' | 'Medium' | 'Hard';
}) {
  const difficultyGuidance = {
    Easy: 'The question should be straightforward, testing basic concepts and fundamental understanding. Avoid complex calculations or multi-step reasoning. Focus on direct application of simple formulas or definitions.',
    Medium: 'The question should require moderate problem-solving skills, involving standard techniques and concepts. May include some calculations or 2-3 step reasoning. Test understanding and application of concepts.',
    Hard: 'The question should be challenging, requiring advanced problem-solving, deep conceptual understanding, or multi-step reasoning. May involve complex calculations, edge cases, or integration of multiple concepts. Test mastery and analytical thinking.'
  };

  return `
Generate one practice question for:
- Exam Profile: ${spec.exam}
- Topic: ${spec.topic}
- Subtopic: ${spec.subtopic}
- Difficulty Level: ${spec.difficulty}

${difficultyGuidance[spec.difficulty]}

The question should be conceptual, appropriate for the selected exam profile and difficulty level.
`;
}

function tryExtractJson(text: string): string | null {
  const fence = text.match(/```json([\s\S]*?)```/i);
  if (fence) return fence[1].trim();

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1);
  }
  return null;
}

async function repairToJson(invalidText: string) {
  const repairPrompt = `
You are a JSON fixer. The INPUT text contains data that should be valid JSON matching this schema:

${SCHEMA_HINT}

YOUR TASK:
- Convert INPUT to valid JSON.
- Fix syntax errors (missing commas, quotes).
- Ensure "options" has exactly 4 items.
- Ensure "correctOptionIndex" is 0..3.
- Remove any code fences or prose.

INPUT:
${invalidText}
`.trim();

  const model = getAiClient();
  const result = await model.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: repairPrompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
      // Speed mode: JSON repair is simple, needs low latency
      thinkingConfig: { thinkingLevel: 'low' as any }
    },
  });

  return result.text || "{}";
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateOneQuestion(topic: string, subTopic: string, examProfile: string, difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'): Promise<QuestionItem> {
  const spec = { exam: examProfile, topic, subtopic: subTopic, difficulty };
  const user = buildUserPrompt(spec);
  const maxRetries = 3;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ai = getAiClient();
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: user,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.2,
          // Speed mode: User is waiting for next question
          thinkingConfig: { thinkingLevel: 'low' as any }
        },
      });

      const raw = res.text || "";
      let jsonStr = tryExtractJson(raw) ?? raw;

      try {
        const parsed = JSON.parse(jsonStr);
        const checked = QuestionSchema.parse(parsed);
        return checked;
      } catch (e) {
        log.warn(`[drut][ai] JSON parse/validate failed on attempt ${attempt}. Retrying...`);
        throw e;
      }

    } catch (error: any) {
      lastError = error;
      log.warn(`Attempt ${attempt} failed:`, error.message);

      if (error.message && error.message.includes("API key is missing")) throw error;

      if (attempt < maxRetries) {
        await delay(1000); // Increased delay for experimental model
      }
    }
  }

  throw new Error(`Failed to generate question after ${maxRetries} attempts: ${lastError?.message}`);
}

export async function generateQuestionsBatch(
  topic: string,
  subTopic: string,
  examProfile: string,
  count: number,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<QuestionItem[]> {
  const spec = { exam: examProfile, topic, subtopic: subTopic, difficulty };

  const batchPrompt = `
Generate EXACTLY ${count} unique practice questions for:
- Exam Profile: ${spec.exam}
- Topic: ${spec.topic}
- Subtopic: ${spec.subtopic}
- Difficulty Level: ${spec.difficulty}

CRITICAL: You must return a JSON ARRAY containing ${count} question objects.
Format: [question1, question2, question3, ...]

DO NOT return a single object. DO NOT wrap in any other structure.
`;

  const BATCH_SYSTEM_INSTRUCTION = `
You are an expert exam question generator.
Your task is to generate EXACTLY ${count} practice questions and return them as a JSON ARRAY.

Each item in the array must match this schema:
${SCHEMA_HINT}

CRITICAL REQUIREMENTS:
- Output MUST be a JSON Array: [item1, item2, item3, ...]
- Array MUST contain EXACTLY ${count} question objects
- DO NOT return a single object
- DO NOT wrap the array in any other structure
- Make each question unique and different from the others
`.trim();

  const maxRetries = 3;
  let lastError: any;

  console.log("[DEBUG] Batch generation request:", { count, topic, subTopic, examProfile, difficulty });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ai = getAiClient();
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: batchPrompt,
        config: {
          systemInstruction: BATCH_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.4,
          // Deep mode: Batch for cache, accuracy > speed
          thinkingConfig: { thinkingLevel: 'high' as any }
        },
      });

      const raw = res.text || "[]";
      console.log("[DEBUG] Raw Gemini Response (first 500 chars):", raw.substring(0, 500));

      const jsonStr = tryExtractJson(raw) ?? raw;
      let parsed = JSON.parse(jsonStr);

      // Fallback: Handle various response formats
      if (!Array.isArray(parsed)) {
        console.log("[DEBUG] Response is not an array. Type:", typeof parsed);
        console.log("[DEBUG] Response keys:", Object.keys(parsed || {}));

        // Check if it's wrapped in a 'questions' key
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
          console.log("[DEBUG] Found 'questions' array in response, extracting it");
          parsed = parsed.questions;
        }
        // Check if it's a single question object - wrap it in array
        else if (parsed && typeof parsed === 'object' &&
          parsed.questionText && parsed.options &&
          typeof parsed.correctOptionIndex === 'number') {
          console.log("[DEBUG] Response is a single question object, wrapping in array");
          parsed = [parsed];
        } else {
          console.error("[DEBUG] Parsed response structure:", JSON.stringify(parsed).substring(0, 200));
          throw new Error("AI returned non-array response for batch generation");
        }
      }

      console.log("[DEBUG] Successfully parsed array with", parsed.length, "items");

      // Validate all items
      const validQuestions: QuestionItem[] = [];
      for (const item of parsed) {
        try {
          const checked = QuestionSchema.parse(item);
          validQuestions.push(checked);
        } catch (e) {
          log.warn('[batch] Skipping invalid question in batch:', e);
        }
      }

      if (validQuestions.length === 0) {
        throw new Error("No valid questions found in batch response");
      }

      return validQuestions;

    } catch (error: any) {
      lastError = error;
      log.warn(`[gemini] Batch generation attempt ${attempt} failed:`, error.message);

      // If it's a quota error, wait longer
      const isQuota = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      const waitTime = isQuota ? attempt * 2000 : 1000; // 2s, 4s, 6s for quota

      if (attempt < maxRetries) {
        console.log(`[gemini] Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  log.error('[gemini] Batch generation failed after retries:', lastError?.message);
  throw lastError;
}

// Deprecated: Use generateQuestionsBatch for multiple
export async function generateBatch(
  topic: string,
  subTopic: string,
  examProfile: string,
  count: number,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<{ success: QuestionItem[], failed: number }> {
  try {
    const questions = await generateQuestionsBatch(topic, subTopic, examProfile, count, difficulty);
    return { success: questions, failed: count - questions.length };
  } catch (error) {
    return { success: [], failed: count };
  }
}

export const generateQuestionAndSolutions = generateOneQuestion;

/**
 * Generate AI-powered study tips based on user performance data
 */
export async function generateAITips(performanceData: {
  totalAttempts: number;
  accuracy: number;
  avgTimeMs: number;
  weakestSubtopics: Array<{ subtopic: string; accuracy: number }>;
  distractors: Array<{ subtopic: string; wrong_answer_text: string; choice_count: number }>;
}): Promise<string[]> {

  // Analyze patterns for better tips
  const isLowAccuracy = performanceData.accuracy < 70;
  const isSlow = performanceData.avgTimeMs > 60000; // > 60 seconds
  const isFast = performanceData.avgTimeMs < 20000; // < 20 seconds
  const hasWeakAreas = performanceData.weakestSubtopics.length > 0;
  const hasManyAttempts = performanceData.totalAttempts > 50;

  const prompt = `
You are an expert learning coach analyzing a student's performance data to provide highly specific, actionable study tips.

PERFORMANCE METRICS:
- Total Questions: ${performanceData.totalAttempts}
- Overall Accuracy: ${performanceData.accuracy.toFixed(1)}%
- Average Response Time: ${Math.round(performanceData.avgTimeMs / 1000)}s per question

WEAK AREAS (Lowest Accuracy):
${performanceData.weakestSubtopics.length > 0
      ? performanceData.weakestSubtopics.map(w => `- ${w.subtopic}: ${w.accuracy.toFixed(1)}% accuracy`).join('\n')
      : '- No weak areas identified yet'}

COMMON TRAPS (Most Clicked Wrong Answers):
${performanceData.distractors.length > 0
      ? performanceData.distractors.slice(0, 3).map(d => `- "${d.wrong_answer_text}" in ${d.subtopic} (clicked ${d.choice_count}x)`).join('\n')
      : '- No distractor patterns identified yet'}

BEHAVIORAL PATTERNS DETECTED:
${isLowAccuracy ? '⚠️ Accuracy below 70% - focus on concept clarity before speed' : ''}
${isSlow ? '⚠️ Slow response time - may indicate overthinking or weak fundamentals' : ''}
${isFast && isLowAccuracy ? '⚠️ Fast but inaccurate - rushing through questions' : ''}
${hasManyAttempts && !hasWeakAreas ? '✅ Consistent performance across topics' : ''}

YOUR TASK:
Generate 4-5 HIGHLY SPECIFIC, ACTIONABLE study tips tailored to THIS student's exact performance patterns.

REQUIREMENTS:
1. Be SPECIFIC - reference actual subtopics, accuracy percentages, or patterns from the data
2. Be ACTIONABLE - tell them exactly what to DO (e.g., "Practice 10 more X questions", "Review Y concept")
3. Be CONCISE - max 20 words per tip
4. PRIORITIZE based on what will have the biggest impact
5. If they're doing well in an area, acknowledge it briefly

BAD EXAMPLE (too generic):
- "Keep practicing"
- "Review your mistakes"

GOOD EXAMPLES (specific & actionable):
- "Focus on ${performanceData.weakestSubtopics[0]?.subtopic || 'weak topics'} - do 15 targeted practice problems"
${performanceData.distractors[0] ? `- "You keep picking '${performanceData.distractors[0].wrong_answer_text.substring(0, 30)}...' - review why this is wrong"` : ''}
${isSlow ? '- "Reduce thinking time to 45s - practice mental math shortcuts"' : ''}
${isFast && isLowAccuracy ? '- "Slow down and read each option carefully before answering"' : ''}

Return ONLY a JSON array of tip strings, no other text.
Example: ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
`;

  try {
    const ai = getAiClient();
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8,
        // Speed mode: Tips are quick, user is waiting
        thinkingConfig: { thinkingLevel: 'low' as any }
      },
    });

    const raw = res.text || "[]";
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 5); // Max 5 tips
    }

    // Fallback with some context
    return [
      `Focus on ${performanceData.weakestSubtopics[0]?.subtopic || 'your weak areas'} - practice more`,
      `Current accuracy: ${performanceData.accuracy.toFixed(0)}% - aim for 80%+`,
      "Review explanations carefully after each wrong answer",
      performanceData.totalAttempts < 20 ? "Keep practicing to build momentum!" : "Great progress! Stay consistent"
    ];
  } catch (error: any) {
    log.error('[gemini] Failed to generate tips:', error.message);
    // Context-aware fallbacks
    return [
      performanceData.accuracy < 70 ? "Focus on understanding concepts before speed" : "Maintain your strong accuracy!",
      performanceData.weakestSubtopics[0] ? `Practice more ${performanceData.weakestSubtopics[0].subtopic} questions` : "Review your mistakes",
      performanceData.avgTimeMs > 60000 ? "Work on faster problem-solving" : "Keep up your good pace!",
      "Take notes on concepts you get wrong"
    ];
  }
}
