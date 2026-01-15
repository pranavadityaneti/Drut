
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Count Textbooks
        const { count: textbookCount } = await supabase
            .from('textbooks')
            .select('*', { count: 'exact', head: true });

        // Count Chapters
        const { count: nodeCount } = await supabase
            .from('knowledge_nodes')
            .select('*', { count: 'exact', head: true })
            .eq('node_type', 'topic');

        // Get Sample Files (Filenames)
        const { data: sampleFiles } = await supabase
            .from('textbooks')
            .select('file_path')
            .limit(5);

        return new Response(JSON.stringify({
            textbooks: textbookCount,
            chapters: nodeCount,
            sampleFiles: sampleFiles
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
