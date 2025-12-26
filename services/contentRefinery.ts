/**
 * Content Refinery Pipeline
 * 
 * Transforms raw questions into "Drut High-Performance" JSON using
 * Gemini 1.5 Pro with Chain-of-Thought reasoning to ensure FSM
 * methods are genuine shortcuts, not simplified explanations.
 */

import { z } from 'zod';
import { getAiClient } from '../lib/ai/vertexAiClient';
import { log } from '../lib/log';

// ============================================================
// Zod Schema for Refined Questions
// ============================================================

export const RefinedQuestionSchema = z.object({
    question_text: z.string().min(10),
    options: z.array(z.string()).length(4),
    correct_option_index: z.number().int().min(0).max(3),
    // The FSM explanation must be distinct from standard
    explanation_fsm: z.string().max(300).describe("The heuristic shortcut"),
    explanation_standard: z.string().describe("The textbook method for fallback"),
    fsm_tag: z.string().regex(/^[a-z0-9-]+$/, {
        message: "fsm_tag must be lowercase kebab-case"
    }),
    target_time_sec: z.number().int().min(10).max(300),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    topic: z.string().min(2),
    subtopic: z.string().min(2),
});

export type RefinedQuestion = z.infer<typeof RefinedQuestionSchema>;

// ============================================================
// Constants
// ============================================================

// Use gemini-3-flash-preview which is the new frontier-class model
// Note: gemini-1.5-pro requires specific API access - using flash for now
const MODEL_NAME = 'gemini-3-flash-preview';
const TEMPERATURE = 0.2; // Consistent, deterministic logic
const MAX_OUTPUT_TOKENS = 4096;

// ============================================================
// Chain-of-Thought High-IQ Prompt
// ============================================================

const SYSTEM_INSTRUCTION = `
You are a top-ranker competitive exam coach (CAT/JEE 99.9%iler) who specializes in teaching speed techniques.

Your task is to transform a raw question into a structured "Drut High-Performance" format by following a rigorous Chain-of-Thought process.

## CHAIN-OF-THOUGHT PROCESS

### STEP 1 - SOLVE (Standard Method)
First, solve the problem using the standard textbook method. Show all steps clearly. This becomes the "explanation_standard" field.

### STEP 2 - OPTIMIZE (Drut Method / FSM)
Now, identify the "Drut Method" (Fastest Safe Method). This MUST be a genuine shortcut, not just a condensed version of Step 1.

Look for these heuristics:
- **Option Elimination**: Can you eliminate 2-3 options by inspection (units digit, sign, magnitude)?
- **Unit Digit Check**: Does the answer's last digit uniquely identify it?
- **Approximation**: Can rough estimation (10% error tolerance) identify the answer?
- **Logical Gaps**: Are there patterns or properties that bypass calculation?
- **Back-Substitution**: Is plugging options faster than forward-solving?

If NO genuine trick exists, still simplify calculation with mental math optimizations.

### STEP 3 - TAG
Assign a strict kebab-case tag representing the heuristic pattern. Examples:
- "unit-digit-elimination"
- "option-magnitude-check"  
- "ratio-inverse-shortcut"
- "quadratic-vieta-sum-product"
- "percentage-approximation"
- "time-work-lcm-method"

## OUTPUT FORMAT

Return ONLY a valid JSON object with this exact structure:
{
  "question_text": "The complete question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_option_index": 0,
  "explanation_fsm": "The heuristic shortcut (max 300 chars)",
  "explanation_standard": "Full textbook solution",
  "fsm_tag": "kebab-case-pattern-tag",
  "target_time_sec": 45,
  "difficulty": "easy" | "medium" | "hard",
  "topic": "Main topic area",
  "subtopic": "Specific subtopic"
}

## CRITICAL RULES
1. explanation_fsm MUST be a genuine shortcut (measurably faster than standard)
2. If the FSM is just "simplify and calculate", explain WHAT makes it faster
3. fsm_tag must be lowercase kebab-case, max 30 characters
4. target_time_sec should reflect FSM solving time, not standard time
5. Output ONLY JSON, no markdown fencing, no explanation outside JSON
`.trim();

// ============================================================
// Core Ingestion Function
// ============================================================

/**
 * Ingest and refine a raw question text into Drut High-Performance JSON
 * Uses Gemini 1.5 Pro with Chain-of-Thought prompting
 * 
 * @param rawText - Raw question text (can be messy, unformatted)
 * @returns Validated RefinedQuestion object
 */
export async function ingestAndRefineQuestion(rawText: string): Promise<RefinedQuestion> {
    if (!rawText || rawText.trim().length < 20) {
        throw new Error('Raw text too short to be a valid question');
    }

    log.info('[refinery] Starting ingestion for question...');

    const userPrompt = `
## RAW QUESTION INPUT

${rawText.trim()}

---

Now process this through the Chain-of-Thought steps:
1. Solve using standard textbook method
2. Find the Drut Method (genuine shortcut)
3. Assign kebab-case fsm_tag

Return ONLY the JSON output.
`.trim();

    try {
        const client = getAiClient();

        // Generate content using Gemini 3 Flash Preview
        const response = await client.models.generateContent({
            model: MODEL_NAME,
            contents: userPrompt,
            config: {
                temperature: TEMPERATURE,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                systemInstruction: SYSTEM_INSTRUCTION,
                // Deep mode: Offline content tagging, accuracy is critical
                thinkingConfig: { thinkingLevel: 'high' as any }
            },
        });

        const text = response.text || '';

        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        log.info('[refinery] Received response, parsing JSON...');

        // Extract JSON from response
        const jsonStr = extractJSON(text);
        const parsed = JSON.parse(jsonStr);

        // Validate against schema
        const validated = RefinedQuestionSchema.parse(parsed);

        log.info(`[refinery] Successfully refined question: ${validated.fsm_tag}`);

        return validated;

    } catch (error: any) {
        log.error('[refinery] Ingestion failed:', error.message);

        // Provide specific error messages
        if (error.name === 'ZodError') {
            const zodError = error as z.ZodError;
            const issues = zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            throw new Error(`Validation failed: ${issues}`);
        }

        if (error.message?.includes('429') || error.message?.includes('QUOTA')) {
            throw new Error('API quota exceeded. Please try again later.');
        }

        throw new Error(`Ingestion failed: ${error.message}`);
    }
}

// ============================================================
// Batch Ingestion
// ============================================================

/**
 * Ingest multiple questions in parallel with rate limiting
 * 
 * @param rawQuestions - Array of raw question texts
 * @param concurrency - Max parallel requests (default: 3)
 * @returns Array of results (success or error for each)
 */
export async function ingestBatch(
    rawQuestions: string[],
    concurrency: number = 3
): Promise<Array<{ success: boolean; data?: RefinedQuestion; error?: string; index: number }>> {
    const results: Array<{ success: boolean; data?: RefinedQuestion; error?: string; index: number }> = [];

    // Process in batches
    for (let i = 0; i < rawQuestions.length; i += concurrency) {
        const batch = rawQuestions.slice(i, i + concurrency);

        const batchPromises = batch.map(async (rawText, batchIndex) => {
            const globalIndex = i + batchIndex;
            try {
                const data = await ingestAndRefineQuestion(rawText);
                return { success: true, data, index: globalIndex };
            } catch (error: any) {
                return { success: false, error: error.message, index: globalIndex };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Rate limit delay between batches
        if (i + concurrency < rawQuestions.length) {
            await delay(1000); // 1 second delay between batches
        }
    }

    return results;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Extract JSON from AI response (handles code fences)
 */
function extractJSON(text: string): string {
    // Try to extract from markdown code fence
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
        return fenceMatch[1].trim();
    }

    // Try to find JSON object directly
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return text.slice(firstBrace, lastBrace + 1);
    }

    // Return as-is and let JSON.parse fail with a clear error
    return text;
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Transform to QuestionData Format (for cache insertion)
// ============================================================

/**
 * Transform RefinedQuestion to the QuestionData format used by the practice engine
 */
export function toQuestionData(refined: RefinedQuestion): {
    questionText: string;
    options: Array<{ text: string }>;
    correctOptionIndex: number;
    timeTargets: { jee_main: number; cat: number; eamcet: number };
    theOptimalPath: {
        exists: boolean;
        preconditions: string;
        steps: string[];
        sanityCheck: string;
    };
    fullStepByStep: { steps: string[] };
    fsmTag: string;
} {
    // Parse FSM into steps if it contains numbered items
    const fsmSteps = refined.explanation_fsm
        .split(/[.;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // Parse standard solution into steps
    const standardSteps = refined.explanation_standard
        .split(/\d+[.)]\s*/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

    return {
        questionText: refined.question_text,
        options: refined.options.map(text => ({ text })),
        correctOptionIndex: refined.correct_option_index,
        timeTargets: {
            jee_main: refined.target_time_sec,
            cat: Math.round(refined.target_time_sec * 0.8), // CAT is faster
            eamcet: Math.round(refined.target_time_sec * 1.2), // EAMCET is slower
        },
        theOptimalPath: {
            exists: true,
            preconditions: `Use when: ${refined.fsm_tag.replace(/-/g, ' ')}`,
            steps: fsmSteps.length > 0 ? fsmSteps : [refined.explanation_fsm],
            sanityCheck: 'Verify answer matches option magnitude/sign',
        },
        fullStepByStep: {
            steps: standardSteps.length > 0 ? standardSteps : [refined.explanation_standard],
        },
        fsmTag: refined.fsm_tag,
    };
}
