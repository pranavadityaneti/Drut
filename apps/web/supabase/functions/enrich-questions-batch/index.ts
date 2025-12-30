import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON, SCHEMA_HINT } from '../_shared/vertex-client.ts';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch pending questions (Limit 5 to avoid timeouts)
        const { data: questions, error: fetchError } = await supabase
            .from('staging_questions')
            .select('*')
            .eq('status', 'pending')
            .limit(5);

        if (fetchError) throw fetchError;
        if (!questions || questions.length === 0) {
            return new Response(JSON.stringify({ message: 'No pending questions' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[enrich-batch] Processing ${questions.length} questions`);
        let processed = 0;

        // 2. Process each question
        for (const q of questions) {
            // Mark as processing
            await supabase.from('staging_questions').update({ status: 'processing' }).eq('id', q.id);

            try {
                // Construct Prompt
                const prompt = `
You are a Physics/Math Expert.
Solve this SPECIFIC question and provide a structured JSON output.

QUESTION: "${q.source_text}"
TOPIC: ${q.topic}
SUBTOPIC: ${q.subtopic}
${q.enriched_data?.original_options ? `PROVIDED OPTIONS: ${q.enriched_data.original_options}` : ''}

TASKS:
1. Verify the answer.
2. If options are provided, map correctIndex.
3. If options are NOT provided, generate 4 valid options (1 correct, 3 distractors).
4. Write a "fastestSafeMethod" (shortcut explanation).

OUTPUT JSON SCHEMA:
${SCHEMA_HINT}

CRITICAL:
- Keep "questionText" EXACTLY as input.
- "diagramRequired": Set false usually, unless it's strictly visual.
`;

                const systemInstruction = "You are a precise educational content engine. Output ONLY JSON.";

                // Call AI
                const response = await generateContent(prompt, systemInstruction, 0.1); // Low temp for accuracy
                const jsonStr = extractJSON(response);
                const enriched = JSON.parse(jsonStr);

                // Update DB
                await supabase
                    .from('staging_questions')
                    .update({
                        enriched_data: enriched,
                        status: 'ready'
                    })
                    .eq('id', q.id);

                processed++;

            } catch (err) {
                console.error(`Error enriching question ${q.id}:`, err);
                // Mark error
                await supabase
                    .from('staging_questions')
                    .update({
                        status: 'error',
                        error_message: err.message
                    })
                    .eq('id', q.id);
            }
        }

        return new Response(JSON.stringify({ processed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Enrich Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
