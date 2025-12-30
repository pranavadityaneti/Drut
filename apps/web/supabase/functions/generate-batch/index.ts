// Edge Function: Generate batch with OPTIONAL verification
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON, verifyAnswer, SCHEMA_HINT } from '../_shared/vertex-client.ts';
import type { GenerateBatchRequest, QuestionItem } from '../_shared/types.ts';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: GenerateBatchRequest = await req.json();

        if (!body.topic || !body.subtopic || !body.examProfile || !body.difficulty || !body.count) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const count = Math.min(body.count, 10);

        const DIAGRAM_REQUIRED_SUBTOPICS = [
            'pulleys-inclined-planes', 'free-body-diagrams', 'projectile-motion',
            'circular-motion', 'mirrors-lenses', 'reflection-refraction',
            'resistances-series-parallel', 'wheatstone-bridge', 'kirchhoffs-laws', 'capacitors',
        ];

        const subtopicLower = body.subtopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const requiresDiagram = DIAGRAM_REQUIRED_SUBTOPICS.some(sub =>
            subtopicLower.includes(sub) || sub.includes(subtopicLower)
        );

        const batchPrompt = `
Generate ${count} physics questions for JEE Main.
Topic: ${body.topic}
Subtopic: ${body.subtopic}
Difficulty: ${body.difficulty}

CRITICAL - OPTION GENERATION:
1. FIRST solve the problem step-by-step
2. Calculate the EXACT numerical answer with units
3. Set Option A = your exact calculated answer
4. Create Options B, C, D as plausible distractors (common mistakes)
5. Set correctOptionIndex = 0 (since Option A is your answer)

PHYSICS FORMULAS:
- Atwood: a = g(m2-m1)/(m1+m2), T = 2*m1*m2*g/(m1+m2)
- Incline with friction: a = g(sinθ - μcosθ)

${requiresDiagram ? `
VISUAL DESCRIPTION (for diagram generation):
Set "diagramRequired": true and write a detailed "visualDescription" for an artist.
Format: "Schematic physics diagram. White background. [describe setup]. Line art style. 4:3 aspect ratio."
Include: angles, masses, surfaces, labels.
` : 'Set "diagramRequired": false and "visualDescription": null.'}

OUTPUT: JSON array of ${count} objects with this exact structure:
{
  "questionText": "...",
  "options": [{"text": "EXACT ANSWER"}, {"text": "..."}, {"text": "..."}, {"text": "..."}],
  "correctOptionIndex": 0,
  "timeTargets": {"jee_main": 180, "cat": 120, "eamcet": 150},
  "fastestSafeMethod": {"exists": true, "preconditions": "...", "steps": ["..."], "sanityCheck": "..."},
  "fullStepByStep": {"steps": ["..."]},
  "fsmTag": "topic-tag",
  "visualDescription": ${requiresDiagram ? '"Schematic physics diagram. White background. ..."' : 'null'},
  "diagramRequired": ${requiresDiagram},
  "difficulty": "${body.difficulty}"
}
`;

        const SYSTEM_INSTRUCTION = `You are a JEE physics expert.
Generate exactly ${count} questions as a JSON array.
CRITICAL: Option A must be your calculated answer. correctOptionIndex must be 0.
Output ONLY valid JSON - no markdown, no explanation.`;

        console.log('[PASS 1] Generating questions...');
        const response = await generateContent(batchPrompt, SYSTEM_INSTRUCTION, 0.2);
        const jsonStr = extractJSON(response);
        let parsed = JSON.parse(jsonStr);

        if (!Array.isArray(parsed)) {
            if (parsed?.questions && Array.isArray(parsed.questions)) {
                parsed = parsed.questions;
            } else if (parsed?.questionText) {
                parsed = [parsed];
            } else {
                throw new Error('AI returned non-array response');
            }
        }

        console.log(`[PASS 1] Got ${parsed.length} questions`);

        // Validate and optionally verify
        const validQuestions: QuestionItem[] = [];

        for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];

            // Basic structure validation only
            if (!item.questionText || !item.options || item.options.length !== 4) {
                console.warn(`[Q${i + 1}] Skipped: invalid structure`);
                continue;
            }

            // Ensure correctOptionIndex is valid
            if (typeof item.correctOptionIndex !== 'number' || item.correctOptionIndex < 0 || item.correctOptionIndex > 3) {
                item.correctOptionIndex = 0; // Default to first option
            }

            // OPTIONAL: Try to verify, but don't reject if verification fails
            try {
                const options = item.options.map((o: any) => o.text);
                const verification = await verifyAnswer(item.questionText, options);

                if (verification.isValid && verification.matchedOptionIndex !== null) {
                    if (verification.matchedOptionIndex !== item.correctOptionIndex) {
                        console.log(`[Q${i + 1}] Correcting answer: ${item.correctOptionIndex} → ${verification.matchedOptionIndex}`);
                        item.correctOptionIndex = verification.matchedOptionIndex;
                    } else {
                        console.log(`[Q${i + 1}] ✓ Answer verified`);
                    }
                } else {
                    console.log(`[Q${i + 1}] Verification inconclusive, keeping original answer`);
                }
            } catch (verifyError) {
                console.warn(`[Q${i + 1}] Verification failed, keeping original answer`);
            }

            validQuestions.push(item);
        }

        if (validQuestions.length === 0) {
            throw new Error('No valid questions generated');
        }

        console.log(`[SUCCESS] ${validQuestions.length}/${parsed.length} questions ready`);

        return new Response(
            JSON.stringify({ questions: validQuestions }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[ERROR]', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to generate' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
