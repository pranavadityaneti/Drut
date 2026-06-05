// Edge Function: Generate Single (Universal v4.0 — RAG-grounded)
// Mirrors generate-batch but produces exactly 1 question (used as a force-generate
// fallback by mobile + web when the cache is empty for a topic).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON } from '../_shared/vertex-client.ts';
import { retrieveTextbookContext, normalizeSubject } from '../_shared/rag.ts';

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const {
            subject: rawSubject = 'Physics',
            topic,
            subtopic,
            difficulty,
            examProfile,
            classLevel,
            board,
        } = body;

        if (!topic || !examProfile) {
            throw new Error('Missing required fields: topic, examProfile');
        }

        const subject = normalizeSubject(rawSubject);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // === RAG retrieval ===
        const rag = await retrieveTextbookContext(supabase, {
            topic,
            subject,
            subtopic,
            classLevel: classLevel || null,
            board: board || null,
            matchCount: 5,
            threshold: 0.5,
        });

        const ragMode = rag.mode === 'rag';
        const contextBlock = ragMode
            ? `
CONTEXT (from official ${subject || 'NCERT'} textbooks — your question MUST be grounded in this content):
${rag.context}
---
`
            : `
NOTE: No textbook context available. Generate from general knowledge.
`;

        const SYSTEM_PROMPT = `
ROLE: Chief Examiner for ${examProfile}.
SUBJECT: ${subject || rawSubject}
TOPIC: ${topic}
SUBTOPIC: ${subtopic || 'Mixed'}
${contextBlock}
TASK: Generate 1 highly relevant MCQ.${ragMode ? ' Every numeric value, formula, and concept must trace to the CONTEXT above.' : ''}

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
  "timeTargets": {"jee_main": 120, "cat": 120, "eamcet": 60, "ap_eapcet": 60, "ts_eapcet": 60},
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

        console.log(`[Single] Requesting: ${topic} | RAG: ${ragMode ? `ON (${rag.chunks.length} chunks)` : 'OFF'}`);

        const rawResponse = await generateContent(SYSTEM_PROMPT);
        const jsonStr = extractJSON(rawResponse);
        const aiData = JSON.parse(jsonStr);

        const correctIndex = aiData.options.findIndex((o: any) => o.isCorrect);

        const finalQuestion = {
            questionText: aiData.questionText,
            options: aiData.options,
            correctOptionIndex: correctIndex === -1 ? 0 : correctIndex,
            visualDescription: aiData.visualDescription,
            diagramRequired: aiData.diagramRequired || false,
            timeTargets: aiData.timeTargets,
            optimal_path: aiData.optimal_path,
            full_solution: aiData.full_solution,
            solution: aiData.full_solution
                ? aiData.full_solution.phases.map((p: any) => p.content).join('\n')
                : 'Solution available.',
            fastestSafeMethod: aiData.optimal_path ? {
                exists: aiData.optimal_path.available,
                steps: aiData.optimal_path.steps,
                patternTrigger: 'Optimization Strategy',
            } : undefined,
            // Trust stamps mirroring generate-batch — mobile/web filter on these
            verification_status: ragMode ? 'v3-verified-rag' : 'v3-unverified-ai',
            source_type: ragMode ? 'rag-verified' : 'ai-generated',
        };

        return new Response(
            JSON.stringify({
                question: finalQuestion,
                rag: {
                    enabled: ragMode,
                    chunkCount: rag.chunks.length,
                    topSimilarity: rag.chunks[0]?.similarity || null,
                },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
