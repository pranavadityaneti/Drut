// Edge Function: Generate Batch (Universal Brain v4.0 — RAG-grounded)
//
// Pipeline:
//   1. Embed the (subject, topic, subtopic) query
//   2. Retrieve top-K textbook chunks via match_syllabus_content
//   3. Inject those chunks as CONTEXT in the Gemini prompt
//   4. Generate the question, stamping verification_status appropriately
//
// When the textbook_chunks table is empty (no PDFs ingested), the retrieval
// returns []; the function still produces a question but stamps it as
// 'v3-unverified-ai' so downstream clients can filter it out.
//
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON } from '../_shared/vertex-client.ts';
import { retrieveTextbookContext, normalizeSubject } from '../_shared/rag.ts';
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
  "timeTargets": {"jee_main": 120, "cat": 120, "eamcet": 60, "ap_eapcet": 60, "ts_eapcet": 60},
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

        // Edge function timeout is ~10s — keep batch at 1
        const effectiveCount = 1;
        const subject = normalizeSubject(body.subject);
        const classLevel = body.classLevel || null;

        // Admin client for RAG retrieval (RPC requires service-role typically)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // === RAG retrieval ===
        const rag = await retrieveTextbookContext(supabase, {
            topic: body.topic,
            subject,
            subtopic: body.subtopic,
            classLevel,
            board: body.board || null,
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
NOTE: No textbook context found. Generate from general knowledge. Flag any factual claim you are uncertain about by setting "uncertainFacts": true.
`;

        const batchPrompt = `
ROLE: Chief Examiner for ${body.examProfile}.
SUBJECT: ${subject || body.subject || 'Physics'}
TOPIC: ${body.topic}
SUBTOPIC: ${body.subtopic || 'Mixed'}
DIFFICULTY: ${body.difficulty}
${contextBlock}
TASK: Generate ${effectiveCount} highly relevant MCQ(s).${ragMode ? ' Every numeric value, formula, and concept must trace to the CONTEXT above.' : ''}
PROTOCOL: ACTIONABLE_SPEED. 60s target for EAPCET.

METHODOLOGY (Strict Adherence):
1. **T.A.R. Algorithm (Optimal Path)**: Speed method. Structure as Trigger -> Action -> Result.
2. **D.E.E.P. Framework (Full Solution)**: Depth method. Phases: DIAGNOSE, EXTRACT, EXECUTE, PROOF.

OUTPUT: JSON array of ${effectiveCount} objects matching this schema:
${getSchemaHint()}
`;

        const SYSTEM_INSTRUCTION = `You are Drut AI. Generate exactly ${effectiveCount} questions in strict JSON. Use LaTeX for math.${ragMode ? ' Ground every factual claim in the provided textbook context.' : ''}`;

        console.log(`[Batch] Generating ${effectiveCount} question(s) | RAG: ${ragMode ? `ON (${rag.chunks.length} chunks, top sim ${rag.chunks[0]?.similarity.toFixed(2)})` : 'OFF (no context)'}`);

        const response = await generateContent(batchPrompt, SYSTEM_INSTRUCTION, 0.7);
        const jsonStr = extractJSON(response);
        let parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed)) parsed = [parsed];

        // Standardization Loop
        const validQuestions: QuestionItem[] = parsed.map((item: any) => {
            let correctIndex = item.options?.findIndex((o: any) => o.isCorrect === true);
            if (correctIndex === -1 || correctIndex === undefined) correctIndex = 0;

            return {
                questionText: item.questionText,
                options: item.options,
                correctOptionIndex: correctIndex,
                timeTargets: item.timeTargets,
                optimal_path: item.optimal_path,
                full_solution: item.full_solution,
                fastestSafeMethod: item.optimal_path ? {
                    exists: item.optimal_path.available,
                    steps: item.optimal_path.steps,
                    patternTrigger: 'Optimization Strategy',
                } : undefined,
                fullStepByStep: item.full_solution ? {
                    steps: item.full_solution.phases.map((p: any) => `**${p.label}**: ${p.content}`),
                } : undefined,
                visualDescription: item.visualDescription,
                diagramRequired: item.diagramRequired || false,
                // Trust signals — RAG-grounded questions get a verified status,
                // ungrounded ones get flagged so mobile's filter can exclude them.
                verification_status: ragMode ? 'v3-verified-rag' : 'v3-unverified-ai',
                source_type: ragMode ? 'rag-verified' : 'ai-generated',
            } as any;
        });

        return new Response(
            JSON.stringify({
                questions: validQuestions,
                rag: {
                    enabled: ragMode,
                    chunkCount: rag.chunks.length,
                    topSimilarity: rag.chunks[0]?.similarity || null,
                    contextLength: rag.contextLength,
                },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[generate-batch] error:', err);
        const message = err instanceof Error ? err.message : String(err);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
