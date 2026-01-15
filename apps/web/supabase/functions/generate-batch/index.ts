// Edge Function: Generate Batch (Universal Brain v3.0 - Stabilized)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON } from '../_shared/vertex-client.ts';
import type { QuestionItem } from '../_shared/types.ts';

interface GenerateBatchRequest {
    topic: string;
    subtopic: string;
    examProfile: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    count: number;
    classLevel?: string;
    board?: string;
    subject?: string;
}

function getSchemaHint() {
    return `
{
  "questionText": "Question string (LaTeX supported)",
  "options": [
    { "text": "Option A", "isCorrect": true },
    { "text": "Option B", "isCorrect": false },
    { "text": "Option C", "isCorrect": false },
    { "text": "Option D", "isCorrect": false }
  ],
  "timeTargets": {"jee_main": 120, "cat": 120, "eamcet": 60},
  "optimal_path": {
      "available": true,
      "steps": ["**Trigger:** Unit mismatch in A...", "**Action:** Eliminate A...", "**Result:** Mark B"]
  },
  "full_solution": {
      "phases": [
          {"label": "DIAGNOSE", "content": "Identify concepts..."},
          {"label": "EXTRACT", "content": "List variables..."},
          {"label": "EXECUTE", "content": "Calculate..."},
          {"label": "PROOF", "content": "Verify..."}
      ]
  },
  "visualDescription": null,
  "diagramRequired": false
}
`.trim();
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body: GenerateBatchRequest = await req.json();
        if (!body.topic || !body.examProfile || !body.difficulty) {
            throw new Error('Missing required fields');
        }

        // CRITICAL FIX: Force Batch Size to 1 to prevent Edge Function Timeout (10s Limit)
        const effectiveCount = 1;

        // RAG Logic (Simplified for brevity - keep your existing RAG block here)
        // ... [Assume your existing RAG block is preserved] ...

        // Prompt Strategy
        const batchPrompt = `
    ROLE: Chief Examiner for ${body.examProfile}.
    SUBJECT: ${body.subject || 'Physics'}
    TOPIC: ${body.topic}
    SUBTOPIC: ${body.subtopic || 'Mixed'}
    DIFFICULTY: ${body.difficulty}
    
    TASK: Generate ${effectiveCount} highly relevant MCQ(s).
    PROTOCOL: ACTIONABLE_SPEED. 45s target.
    
    METHODOLOGY (Strict Adherence):
    1. **T.A.R. Algorithm (Optimal Path)**: Speed method. Structure as Trigger -> Action -> Result.
    2. **D.E.E.P. Framework (Full Solution)**: Depth method. Phases: DIAGNOSE, EXTRACT, EXECUTE, PROOF.
    
    OUTPUT: JSON array of ${effectiveCount} objects.
    ${getSchemaHint()}
`;

        const SYSTEM_INSTRUCTION = `You are Drut AI. Generate exactly ${effectiveCount} questions in strict JSON. Use LaTeX for math.`;

        console.log(`[Batch] Generating ${effectiveCount} question(s)...`);

        // FIX: No hardcoded model. Let vertex-client.ts decide (gemini-3-flash-preview).
        const response = await generateContent(batchPrompt, SYSTEM_INSTRUCTION, 0.7);

        const jsonStr = extractJSON(response);
        let parsed = JSON.parse(jsonStr);

        if (!Array.isArray(parsed)) parsed = [parsed]; // Normalize

        // Standardization Loop
        const validQuestions: QuestionItem[] = parsed.map((item: any) => {
            // Map isCorrect to index
            let correctIndex = item.options?.findIndex((o: any) => o.isCorrect === true);
            if (correctIndex === -1) correctIndex = 0;

            return {
                questionText: item.questionText,
                options: item.options, // Ensure your frontend handles {text, isCorrect} or map it here
                correctOptionIndex: correctIndex,
                timeTargets: item.timeTargets,

                // NEW SCHEMA MAPPING
                optimal_path: item.optimal_path,
                full_solution: item.full_solution,

                // Legacy Fallback (Prevent UI Crash)
                fastestSafeMethod: item.optimal_path ? {
                    exists: item.optimal_path.available,
                    steps: item.optimal_path.steps,
                    patternTrigger: "Optimization Strategy"
                } : undefined,
                fullStepByStep: item.full_solution ? {
                    steps: item.full_solution.phases.map((p: any) => `**${p.label}**: ${p.content}`)
                } : undefined,

                visualDescription: item.visualDescription,
                diagramRequired: item.diagramRequired || false
            };
        });

        return new Response(JSON.stringify({ questions: validQuestions }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Batch Error]', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});
