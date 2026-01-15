// Edge Function: Enrich Textbook (The Analyst Agent)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { generateContent } from '../_shared/vertex-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch "Raw" Chunks (Where metadata->archetype is missing)
    const { data: chunks, error } = await supabase
        .from('textbook_chunks')
        .select('id, content, metadata')
        .is('metadata->archetype', null) // Only unprocessed chunks
        .limit(10); // Batch size (keep small to avoid timeouts)

    if (error) return new Response(JSON.stringify({ error }), { status: 500 });
    if (!chunks || chunks.length === 0) {
        return new Response(JSON.stringify({ message: 'No chunks to enrich' }), { headers: corsHeaders });
    }

    const results = [];

    // 2. The "Analyst" Loop
    for (const chunk of chunks) {
        // The "3D View" Prompt
        const prompt = `
      You are an Expert EAPCET Exam Analyst.
      Analyze this textbook snippet.
      
      Task: Tag it for Question Generation.
      
      Return JSON:
      {
        "archetype": "DEFINITION" | "DERIVATION" | "GRAPH_DESC" | "FORMULA" | "GENERIC",
        "difficulty_potential": "EASY" | "MEDIUM" | "HARD",
        "is_trap": boolean, (True if it contains a common student misconception)
        "key_concept": "String" (e.g., "Moment of Inertia")
      }

      TEXT: "${chunk.content.substring(0, 1000).replace(/"/g, "'")}"
    `;

        try {
            // Call Gemini Flash (Fast & Cheap)
            // FIXED: Calling signature to match existing vertex-client.ts
            // generateContent(prompt, systemInstruction, temperature, model)
            const aiRes = await generateContent(prompt, undefined, 0);

            // Cleanup JSON
            const cleanJson = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
            const tags = JSON.parse(cleanJson);

            // 3. Update Database
            const newMetadata = { ...chunk.metadata, ...tags };

            await supabase
                .from('textbook_chunks')
                .update({ metadata: newMetadata })
                .eq('id', chunk.id);

            results.push({ id: chunk.id, tags });

        } catch (err) {
            console.error(`Failed to enrich chunk ${chunk.id}:`, err);
        }
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
});
