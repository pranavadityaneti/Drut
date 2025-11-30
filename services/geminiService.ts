
import { QuestionSchema, type QuestionItem } from "../lib/ai/schema";
import { getAiClient } from "../lib/ai/gemini";
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
    "exists": boolean,  // true if a genuinely faster alternative method exists (not just shortened steps)
    "preconditions": string,  // What the student needs to know/recognize to use this fast method
    "steps": string[],  // Steps using speed-optimized techniques (mental math, pattern recognition, option elimination, back-solving, exam tricks)
    "sanityCheck": string  // Quick verification that the fast method gives correct answer
  },
  "fullStepByStep": { 
    "steps": string[]  // Traditional educational approach - detailed, didactic, teaches the concept properly
  }
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

CRITICAL: "fastestSafeMethod" and "fullStepByStep" must be FUNDAMENTALLY DIFFERENT approaches, not just shortened vs detailed versions.

FASTEST SAFE METHOD ("fastestSafeMethod"):
- Must use a DIFFERENT problem-solving approach optimized for speed, not just fewer steps.
- Should employ speed-optimized techniques such as:
  * Mental math shortcuts and quick calculations
  * Pattern recognition (spotting familiar structures, formulas, or symmetries)
  * Option elimination (quickly ruling out obviously wrong answers)
  * Back-solving (working backwards from answer choices)
  * Exam-specific tricks and shortcuts (CAT/JEE/EAMCET specific strategies)
  * Visual/spatial reasoning when applicable
- Focus on "how to solve this FASTEST while being correct" - prioritize time efficiency.
- Steps should be concise but emphasize the speed technique used.
- If a fast method doesn't exist safely, set "exists": false.

FULL STEP-BY-STEP ("fullStepByStep"):
- Should use the traditional, educational approach that teaches the concept properly.
- Focus on "how to solve this CORRECTLY and UNDERSTANDABLY" - prioritize learning.
- Should be detailed, didactic, and show all logical steps clearly.
- This is the method students should learn to understand the underlying concept.
- Even if slower, this method should demonstrate proper mathematical reasoning.

Remember: These are TWO DIFFERENT SOLUTION PATHS, not the same path with different detail levels.
`.trim();

function buildUserPrompt(spec: {
  exam: string; topic: string; subtopic: string; difficulty: 'Easy' | 'Medium' | 'Hard';
}) {
  const difficultyGuidance = {
    Easy: 'The question should be straightforward, testing basic concepts and fundamental understanding. Avoid complex calculations or multi-step reasoning. Focus on direct application of simple formulas or definitions.',
    Medium: 'The question should require moderate problem-solving skills, involving standard techniques and concepts. May include some calculations or 2-3 step reasoning. Test understanding and application of concepts.',
    Hard: 'The question should be challenging, requiring advanced problem-solving, deep conceptual understanding, or multi-step reasoning. May involve complex calculations, edge cases, or integration of multiple concepts. Test mastery and analytical thinking.'
  };

  const examSpeedStrategies = {
    cat: 'For CAT: Fastest Safe Method should leverage quick mental calculations, option elimination, pattern recognition in numbers/sequences, and time-saving tricks. CAT emphasizes speed and accuracy under time pressure.',
    jee_main: 'For JEE Main: Fastest Safe Method should use formula shortcuts, symmetry/pattern recognition, dimensional analysis, and elimination techniques. JEE Main rewards quick problem identification and efficient solving.',
    eamcet: 'For EAMCET: Fastest Safe Method should focus on direct formula application, quick substitution techniques, and recognizing standard problem types. EAMCET values speed in applying learned concepts.'
  };

  const speedStrategyHint = examSpeedStrategies[spec.exam as keyof typeof examSpeedStrategies] || 
    'Fastest Safe Method should use speed-optimized techniques appropriate for competitive exams: mental math, pattern recognition, option elimination, back-solving, or exam-specific shortcuts.';

  return `
Generate one practice question for:
- Exam Profile: ${spec.exam}
- Topic: ${spec.topic}
- Subtopic: ${spec.subtopic}
- Difficulty Level: ${spec.difficulty}

${difficultyGuidance[spec.difficulty]}

${speedStrategyHint}

IMPORTANT FOR SOLUTION GENERATION:
- Generate TWO FUNDAMENTALLY DIFFERENT solution approaches:
  1. "fastestSafeMethod": Use a speed-optimized technique (mental shortcuts, pattern recognition, option elimination, back-solving, exam tricks). This should be a DIFFERENT approach, not just fewer steps.
  2. "fullStepByStep": Use the traditional educational method that teaches the concept properly with all logical steps shown clearly.

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

  const ai = getAiClient();
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: repairPrompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  return res.text || "{}";
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateOneQuestion(topic: string, subTopic: string, examProfile: string, difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'): Promise<QuestionItem> {
  const spec = { exam: examProfile, topic, subtopic: subTopic, difficulty };
  const user = buildUserPrompt(spec);
  const maxRetries = 2; // Reduced from 3 to 2 for faster failure

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ai = getAiClient();
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',  // Faster, lighter model
        contents: user, // User prompt
        config: {
          systemInstruction: SYSTEM_INSTRUCTION, // System prompt as proper config
          responseMimeType: "application/json",
          temperature: 0.2,  // Lower = faster generation
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
        // Skip repair to save time - just retry with a new generation
        throw e;
      }

    } catch (error: any) {
      lastError = error;
      log.warn(`Attempt ${attempt} failed:`, error.message);

      if (error.message && error.message.includes("API key is missing")) throw error;

      if (attempt < maxRetries) {
        await delay(300); // Reduced from 500ms to 300ms for faster retries
      }
    }
  }

  throw new Error(`Failed to generate question after ${maxRetries} attempts: ${lastError?.message}`);
}

const limit = pLimit(3);

export async function generateBatch(
  topic: string,
  subTopic: string,
  examProfile: string,
  count: number,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<{ success: QuestionItem[], failed: number }> {
  const promises = Array.from({ length: count }).map(() =>
    limit(() => generateOneQuestion(topic, subTopic, examProfile, difficulty)
      .catch(err => {
        log.warn('[batch] Individual generation failed:', err.message);
        return null;
      })
    )
  );

  const results = await Promise.all(promises);
  const success = results.filter((r): r is QuestionItem => r !== null);

  return {
    success,
    failed: count - success.length
  };
}

export const generateQuestionAndSolutions = generateOneQuestion;
