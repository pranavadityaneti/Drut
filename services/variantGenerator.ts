/**
 * Variant Generator Service
 * 
 * Generates isomorphic question variants from a Master Question using Gemini.
 * Variants have the same logic/FSM strategy but different numbers/context.
 */

import { z } from 'zod';
import { getAiClient } from '../lib/ai/vertexAiClient';
import { log } from '../lib/log';
import pLimit from 'p-limit';

// ============================================================
// Types
// ============================================================

export interface MasterQuestion {
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation_fsm: string;
    explanation_standard?: string;
    fsm_tag: string;
    target_time_sec: number;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    subtopic: string;
}

export interface GeneratedVariant extends MasterQuestion {
    variant_number: number;
}

// Schema for validating AI output
const VariantOutputSchema = z.object({
    question_text: z.string().min(10),
    options: z.array(z.string()).length(4),
    correct_option_index: z.number().int().min(0).max(3),
    explanation_fsm: z.string().min(10),
    explanation_standard: z.string().optional(),
});

// ============================================================
// Constants
// ============================================================

const MODEL_NAME = 'gemini-3-flash-preview';
const TEMPERATURE = 0.7; // Higher for creative variance
const MAX_OUTPUT_TOKENS = 4096;

// ============================================================
// Prompt Template
// ============================================================

const buildSystemPrompt = (master: MasterQuestion) => `
You are an expert question factory for competitive exams. Your task is to generate ISOMORPHIC questions.

## MASTER QUESTION CONTEXT
- FSM Strategy: "${master.fsm_tag}"
- Difficulty: ${master.difficulty}
- Topic: ${master.topic} > ${master.subtopic}
- Target Time: ${master.target_time_sec} seconds

## FSM EXPLANATION (The Golden Standard)
${master.explanation_fsm}

## RULES FOR VARIANTS
1. **Same Logic**: The solving approach must be IDENTICAL to the master
2. **Different Numbers**: Change numerical values while keeping the answer clean (integer or simple fraction)
3. **Different Context**: You may change names, scenarios, or wording
4. **Same Structure**: Keep 4 options in similar format to master
5. **Preserve FSM**: The explanation_fsm must describe the SAME heuristic/shortcut

## OUTPUT FORMAT
Return a JSON object with these exact fields:
{
  "question_text": "The new question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_option_index": 0,
  "explanation_fsm": "The FSM explanation for this variant",
  "explanation_standard": "Optional standard textbook solution"
}

CRITICAL: Output ONLY valid JSON, no markdown, no extra text.
`.trim();

// ============================================================
// Core Functions
// ============================================================

/**
 * Generate a single variant from a master question
 */
async function generateSingleVariant(
    master: MasterQuestion,
    variantNumber: number
): Promise<GeneratedVariant> {
    const client = getAiClient();

    const userPrompt = `
## MASTER QUESTION
${master.question_text}

## OPTIONS
A) ${master.options[0]}
B) ${master.options[1]}
C) ${master.options[2]}
D) ${master.options[3]}

Correct Answer: ${String.fromCharCode(65 + master.correct_option_index)}

---

Generate Variant #${variantNumber}. Remember:
- Change the numbers/values
- Keep the same logical structure
- Ensure the answer is a clean integer or simple fraction
- Maintain the "${master.fsm_tag}" solving strategy

Return ONLY the JSON output.
`.trim();

    try {
        const response = await client.models.generateContent({
            model: MODEL_NAME,
            contents: userPrompt,
            config: {
                temperature: TEMPERATURE,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                systemInstruction: buildSystemPrompt(master),
                // Deep mode: Variant generation is offline, needs accuracy
                thinkingConfig: { thinkingLevel: 'high' as any }
            },
        });

        const text = response.text || '';
        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        // Extract and parse JSON
        const jsonStr = extractJSON(text);
        const parsed = JSON.parse(jsonStr);
        const validated = VariantOutputSchema.parse(parsed);

        return {
            ...validated,
            fsm_tag: master.fsm_tag, // Force same tag
            target_time_sec: master.target_time_sec,
            difficulty: master.difficulty,
            topic: master.topic,
            subtopic: master.subtopic,
            explanation_standard: validated.explanation_standard || master.explanation_standard || '',
            variant_number: variantNumber,
        };
    } catch (error: any) {
        log.error(`[variantGenerator] Failed to generate variant ${variantNumber}:`, error.message);
        throw new Error(`Variant ${variantNumber} generation failed: ${error.message}`);
    }
}

/**
 * Generate multiple variants for a master question
 * Uses rate limiting to avoid API throttling
 */
export async function generateVariants(
    master: MasterQuestion,
    count: number = 3
): Promise<GeneratedVariant[]> {
    log.info(`[variantGenerator] Generating ${count} variants for: ${master.fsm_tag}`);

    // Rate limit to 2 concurrent requests
    const limit = pLimit(2);
    const variantNumbers = Array.from({ length: count }, (_, i) => i + 1);

    const results = await Promise.allSettled(
        variantNumbers.map(num =>
            limit(() => generateSingleVariant(master, num))
        )
    );

    const variants: GeneratedVariant[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            variants.push(result.value);
        } else {
            errors.push(`Variant ${index + 1}: ${result.reason}`);
        }
    });

    if (errors.length > 0) {
        log.warn(`[variantGenerator] Some variants failed: ${errors.join('; ')}`);
    }

    log.info(`[variantGenerator] Successfully generated ${variants.length}/${count} variants`);

    return variants;
}

/**
 * Validate that a variant matches its master's FSM strategy
 */
export function validateVariant(master: MasterQuestion, variant: GeneratedVariant): boolean {
    // FSM tag must match exactly
    if (variant.fsm_tag !== master.fsm_tag) {
        log.warn('[variantGenerator] FSM tag mismatch:', {
            master: master.fsm_tag,
            variant: variant.fsm_tag
        });
        return false;
    }

    // Difficulty must match
    if (variant.difficulty !== master.difficulty) {
        return false;
    }

    // Topic and subtopic must match
    if (variant.topic !== master.topic || variant.subtopic !== master.subtopic) {
        return false;
    }

    return true;
}

// ============================================================
// Helpers
// ============================================================

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

    return text;
}
