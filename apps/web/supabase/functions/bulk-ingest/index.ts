/**
 * Bulk Ingest Edge Function
 * 
 * Processes CSV-uploaded questions:
 * 1. Saves each master question to cached_questions
 * 2. Generates 3 isomorphic variants using Gemini
 * 3. Saves variants with parent_question_id reference
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON } from '../_shared/vertex-client.ts';

// ============================================================
// Types
// ============================================================

interface ParsedQuestion {
    topic: string;
    subtopic: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation_fsm: string;
    fsm_tag: string;
    target_time_sec: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface VariantOutput {
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation_fsm: string;
}

// ============================================================
// Prompts
// ============================================================

const buildVariantSystemPrompt = (master: ParsedQuestion) => `
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
Return a JSON ARRAY with exactly 3 variant objects:
[
  {
    "question_text": "New question 1",
    "options": ["A", "B", "C", "D"],
    "correct_option_index": 0,
    "explanation_fsm": "FSM explanation for variant 1"
  },
  ...
]

CRITICAL: Output ONLY valid JSON array, no markdown, no extra text.
`.trim();

const buildVariantUserPrompt = (master: ParsedQuestion) => `
## MASTER QUESTION
${master.question_text}

## OPTIONS
A) ${master.options[0]}
B) ${master.options[1]}
C) ${master.options[2]}
D) ${master.options[3]}

Correct Answer: ${String.fromCharCode(65 + master.correct_option_index)}

---

Generate 3 isomorphic variants. Remember:
- Change the numbers/values
- Keep the same logical structure
- Ensure answers are clean integers or simple fractions
- Maintain the "${master.fsm_tag}" solving strategy

Return ONLY the JSON array.
`.trim();

// ============================================================
// Main Handler
// ============================================================

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { questions } = await req.json() as { questions: ParsedQuestion[] };

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No questions provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[bulk-ingest] Processing ${questions.length} questions`);

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let succeeded = 0;
        let failed = 0;
        const errors: string[] = [];

        // Process questions sequentially with rate limiting
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            console.log(`[bulk-ingest] Processing ${i + 1}/${questions.length}: ${question.fsm_tag}`);

            try {
                // 1. Build question_data JSONB
                const questionData = {
                    questionText: question.question_text,
                    options: question.options.map(text => ({ text })),
                    correctOptionIndex: question.correct_option_index,
                    timeTargets: {
                        jee_main: question.target_time_sec,
                        cat: Math.round(question.target_time_sec * 0.8),
                        eamcet: Math.round(question.target_time_sec * 1.2),
                    },
                    fastestSafeMethod: {
                        exists: true,
                        preconditions: `Use when: ${question.fsm_tag.replace(/-/g, ' ')}`,
                        steps: [question.explanation_fsm],
                        sanityCheck: 'Verify answer matches option magnitude/sign',
                    },
                    fullStepByStep: { steps: [question.explanation_fsm] },
                    fsmTag: question.fsm_tag,
                };

                // 2. Save master question
                const masterId = crypto.randomUUID();
                const { error: masterError } = await supabase
                    .from('cached_questions')
                    .insert({
                        id: masterId,
                        question_id: `master-${masterId.slice(0, 8)}`,
                        exam_profile: 'CAT / MBA', // Default, could be parameterized
                        topic: question.topic,
                        subtopic: question.subtopic,
                        question_data: questionData,
                        parent_question_id: null,
                        variant_number: null,
                        source: 'csv',
                    });

                if (masterError) {
                    throw new Error(`Failed to save master: ${masterError.message}`);
                }

                // 3. Generate 3 variants using Gemini
                const systemPrompt = buildVariantSystemPrompt(question);
                const userPrompt = buildVariantUserPrompt(question);

                const response = await generateContent(userPrompt, systemPrompt, 0.7);
                const jsonStr = extractJSON(response);
                const variants = JSON.parse(jsonStr) as VariantOutput[];

                if (!Array.isArray(variants) || variants.length === 0) {
                    throw new Error('AI returned invalid variant array');
                }

                // 4. Save variants
                const variantInserts = variants.slice(0, 3).map((v, idx) => {
                    const variantId = crypto.randomUUID();
                    const variantData = {
                        questionText: v.question_text,
                        options: v.options.map(text => ({ text })),
                        correctOptionIndex: v.correct_option_index,
                        timeTargets: questionData.timeTargets,
                        fastestSafeMethod: {
                            exists: true,
                            preconditions: questionData.fastestSafeMethod.preconditions,
                            steps: [v.explanation_fsm],
                            sanityCheck: questionData.fastestSafeMethod.sanityCheck,
                        },
                        fullStepByStep: { steps: [v.explanation_fsm] },
                        fsmTag: question.fsm_tag, // Force same tag
                    };

                    return {
                        id: variantId,
                        question_id: `variant-${variantId.slice(0, 8)}`,
                        exam_profile: 'CAT / MBA',
                        topic: question.topic,
                        subtopic: question.subtopic,
                        question_data: variantData,
                        parent_question_id: masterId,
                        variant_number: idx + 1,
                        source: 'ai-generated',
                    };
                });

                const { error: variantError } = await supabase
                    .from('cached_questions')
                    .insert(variantInserts);

                if (variantError) {
                    console.error('[bulk-ingest] Variant insert error:', variantError);
                    // Master succeeded, but variants failed - still count as partial success
                }

                succeeded++;
                console.log(`[bulk-ingest] ✓ Saved master + ${variantInserts.length} variants for ${question.fsm_tag}`);

            } catch (err: any) {
                failed++;
                errors.push(`Row ${i + 1}: ${err.message}`);
                console.error(`[bulk-ingest] ✗ Failed row ${i + 1}:`, err.message);
            }

            // Rate limiting: 1 second delay between questions
            if (i < questions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`[bulk-ingest] Complete: ${succeeded} succeeded, ${failed} failed`);

        return new Response(
            JSON.stringify({ succeeded, failed, errors }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error('[bulk-ingest] Error:', err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
