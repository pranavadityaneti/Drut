// Edge Function: Generate Single (Universal v3.0 - Standardized)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON } from '../_shared/vertex-client.ts';

// ... [Keep your Imports and Interfaces] ...

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const { subject = 'Physics', topic, subtopic, difficulty, examProfile } = body;

        // ... [Keep RAG Logic] ...

        const SYSTEM_PROMPT = `
    ROLE: Chief Examiner for ${examProfile}.
    SUBJECT: ${subject}
    TOPIC: ${topic}
    SUBTOPIC: ${subtopic || 'Mixed'}
    
    TASK: Generate 1 highly relevant MCQ.
    
    METHODOLOGY:
    1. **T.A.R. Algorithm**: Trigger, Action, Result (Speed).
    2. **D.E.E.P. Framework**: Diagnose, Extract, Execute, Proof (Depth).
    
    OUTPUT JSON SCHEMA (Strict):
    {
      "questionText": "Problem statement (LaTeX)",
      "options": [
        { "text": "A...", "isCorrect": false },
        { "text": "B...", "isCorrect": true },
        { "text": "C...", "isCorrect": false },
        { "text": "D...", "isCorrect": false }
      ],
      "timeTargets": {"jee_main": 120, "cat": 120, "eamcet": 60},
      "optimal_path": {
        "available": true,
        "steps": ["**Trigger:**...", "**Action:**...", "**Result:**..."]
      },
      "full_solution": {
        "phases": [
          {"label": "DIAGNOSE", "content": "..."},
          {"label": "EXTRACT", "content": "..."},
          {"label": "EXECUTE", "content": "..."},
          {"label": "PROOF", "content": "..."}
        ]
      },
      "visualDescription": null,
      "diagramRequired": false
    }
`.trim();

        console.log(`[Single] Requesting: ${topic}`);

        // FIX: No hardcoded model argument. Uses vertex-client default.
        const rawResponse = await generateContent(SYSTEM_PROMPT);
        const jsonStr = extractJSON(rawResponse);
        const aiData = JSON.parse(jsonStr);

        // Normalize Options
        const correctIndex = aiData.options.findIndex((o: any) => o.isCorrect);

        const finalQuestion = {
            questionText: aiData.questionText,
            options: aiData.options,
            correctOptionIndex: correctIndex === -1 ? 0 : correctIndex,
            visualDescription: aiData.visualDescription,
            diagramRequired: aiData.diagramRequired || false,

            // NEW SCHEMA
            optimal_path: aiData.optimal_path,
            full_solution: aiData.full_solution,

            // Legacy Mapping (Safety)
            solution: aiData.full_solution ? aiData.full_solution.phases.map((p: any) => p.content).join('\n') : "Solution available.",
            fastestSafeMethod: aiData.optimal_path ? {
                exists: aiData.optimal_path.available,
                steps: aiData.optimal_path.steps,
                patternTrigger: "Optimization Strategy"
            } : undefined
        };

        // ... [Keep Validation Logic] ...

        return new Response(JSON.stringify({ question: finalQuestion }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});
