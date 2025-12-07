// Edge Function: Generate single question
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON, SCHEMA_HINT } from '../_shared/vertex-client.ts';
import type { GenerateQuestionRequest, QuestionItem } from '../_shared/types.ts';

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

function buildUserPrompt(spec: GenerateQuestionRequest) {
    const difficultyGuidance = {
        Easy: 'The question should be straightforward, testing basic concepts and fundamental understanding. Avoid complex calculations or multi-step reasoning.',
        Medium: 'The question should require moderate problem-solving skills, involving standard techniques and concepts. May include some calculations or 2-3 step reasoning.',
        Hard: 'The question should be challenging, requiring advanced problem-solving, deep conceptual understanding, or multi-step reasoning.',
    };

    return `
Generate one practice question for:
- Exam Profile: ${spec.examProfile}
- Topic: ${spec.topic}
- Subtopic: ${spec.subtopic}
- Difficulty Level: ${spec.difficulty}

${difficultyGuidance[spec.difficulty]}

The question should be conceptual, appropriate for the selected exam profile and difficulty level.
`;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: GenerateQuestionRequest = await req.json();

        // Validate request
        if (!body.topic || !body.subtopic || !body.examProfile || !body.difficulty) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const userPrompt = buildUserPrompt(body);

        // Generate content using Vertex AI
        const response = await generateContent(userPrompt, SYSTEM_INSTRUCTION, 0.3);
        const jsonStr = extractJSON(response);
        const question: QuestionItem = JSON.parse(jsonStr);

        // Validate question structure
        if (!question.questionText || !question.options || question.options.length !== 4) {
            throw new Error('Invalid question format from AI');
        }

        return new Response(
            JSON.stringify({ question }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error generating question:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to generate question' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
