// Edge Function: Generate batch of questions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON, SCHEMA_HINT } from '../_shared/vertex-client.ts';
import type { GenerateBatchRequest, QuestionItem } from '../_shared/types.ts';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: GenerateBatchRequest = await req.json();

        // Validate request
        if (!body.topic || !body.subtopic || !body.examProfile || !body.difficulty || !body.count) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const count = Math.min(body.count, 10); // Limit to 10 questions per batch

        const batchPrompt = `
Generate EXACTLY ${count} unique practice questions for:
- Exam Profile: ${body.examProfile}
- Topic: ${body.topic}
- Subtopic: ${body.subtopic}
- Difficulty Level: ${body.difficulty}

CRITICAL: You must return a JSON ARRAY containing ${count} question objects.
Format: [question1, question2, question3, ...]

DO NOT return a single object. DO NOT wrap in any other structure.
Each question must match this schema:
${SCHEMA_HINT}
`;

        const BATCH_SYSTEM_INSTRUCTION = `
You are an expert exam question generator.
Your task is to generate EXACTLY ${count} practice questions and return them as a JSON ARRAY.

Each item in the array must match the question schema.

CRITICAL REQUIREMENTS:
- Output MUST be a JSON Array: [item1, item2, item3, ...]
- Array MUST contain EXACTLY ${count} question objects
- DO NOT return a single object
- DO NOT wrap the array in any other structure
- Make each question unique and different from the others
`.trim();

        // Generate content using Vertex AI
        const response = await generateContent(batchPrompt, BATCH_SYSTEM_INSTRUCTION, 0.4);
        const jsonStr = extractJSON(response);
        let parsed = JSON.parse(jsonStr);

        // Handle non-array responses
        if (!Array.isArray(parsed)) {
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
                parsed = parsed.questions;
            } else if (parsed && typeof parsed === 'object' && parsed.questionText) {
                parsed = [parsed];
            } else {
                throw new Error('AI returned non-array response for batch generation');
            }
        }

        // Validate questions
        const validQuestions: QuestionItem[] = [];
        for (const item of parsed) {
            if (item.questionText && item.options && item.options.length === 4) {
                validQuestions.push(item);
            }
        }

        if (validQuestions.length === 0) {
            throw new Error('No valid questions generated');
        }

        return new Response(
            JSON.stringify({ questions: validQuestions }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error generating batch:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to generate batch' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
