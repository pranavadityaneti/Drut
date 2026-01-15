
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("[reprocess-all] Starting batch reprocessing...");

        // 1. Initialize Supabase Admin Client (Server-side has the key!)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. List All Textbooks
        const { data: textbooks, error: listError } = await supabase
            .from('textbooks')
            .select('id, title, file_path');

        if (listError) throw listError;

        console.log(`[reprocess-all] Found ${textbooks.length} textbooks.`);

        console.log(`[reprocess-all] Found ${textbooks.length} textbooks.`);

        // 3. Trigger Ingest for each (BACKGROUND)
        // @ts-ignore
        EdgeRuntime.waitUntil((async () => {
            console.log(`[reprocess-all] Starting background processing of ${textbooks.length} files...`);
            for (const tb of textbooks) {
                console.log(`[reprocess-all] Triggering for: ${tb.title} (${tb.file_path})`);

                try {
                    const { error } = await supabase.functions.invoke('ingest-textbook', {
                        body: {
                            filePath: tb.file_path,
                            skipExtraction: false,
                            skipChunking: true, // Optimized for syllabus extraction only
                            textContent: null
                        }
                    });

                    if (error) console.error(`[reprocess-all] Failed for ${tb.title}:`, error);
                    else console.log(`[reprocess-all] Success for ${tb.title}`);

                } catch (err) {
                    console.error(`[reprocess-all] Unexpected error for ${tb.title}:`, err);
                }
            }
            console.log("[reprocess-all] Background processing complete.");
        })());

        return new Response(JSON.stringify({
            message: `Scrape triggered for ${textbooks.length} textbooks. Processing in background. Check database for updates.`,
            success: true
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
