// Edge Function: Generate diagram image and upload to Supabase Storage
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { generateDiagramImage } from '../_shared/vertex-client.ts';
import type { DiagramRequest } from '../_shared/types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const startTime = Date.now();

    try {
        const body: DiagramRequest = await req.json();

        // Validate request
        if (!body.questionId || !body.visualDescription) {
            return new Response(
                JSON.stringify({ error: 'Missing questionId or visualDescription' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[generate-diagram] Starting for question: ${body.questionId}`);

        // 1. Generate diagram image
        const imageResult = await generateDiagramImage(body.visualDescription);

        if (!imageResult) {
            console.error(`[generate-diagram] Image generation failed for: ${body.questionId}`);
            return new Response(
                JSON.stringify({ error: 'Image generation failed', questionId: body.questionId }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[generate-diagram] Image generated in ${Date.now() - startTime}ms`);

        // 2. Upload to Supabase Storage
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const fileName = `diagrams/${body.questionId}.png`;
        const imageBuffer = Uint8Array.from(atob(imageResult.base64), c => c.charCodeAt(0));

        const { error: uploadError } = await supabase.storage
            .from('question-assets')
            .upload(fileName, imageBuffer, {
                contentType: imageResult.mimeType,
                upsert: true,
            });

        if (uploadError) {
            console.error(`[generate-diagram] Upload failed:`, uploadError);
            return new Response(
                JSON.stringify({ error: 'Storage upload failed', details: uploadError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Get public URL
        const { data: urlData } = supabase.storage
            .from('question-assets')
            .getPublicUrl(fileName);

        const diagramUrl = urlData.publicUrl;

        console.log(`[generate-diagram] Complete in ${Date.now() - startTime}ms. URL: ${diagramUrl}`);

        return new Response(
            JSON.stringify({
                success: true,
                questionId: body.questionId,
                diagramUrl,
                durationMs: Date.now() - startTime
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[generate-diagram] Error:', error);

        // Check for timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > 50000) {
            return new Response(
                JSON.stringify({ error: 'Timeout - diagram generation took too long', durationMs: elapsed }),
                { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: error.message || 'Failed to generate diagram' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
