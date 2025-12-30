import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Buffer } from 'node:buffer';
import { corsHeaders } from '../_shared/cors.ts';
import { embedText } from '../_shared/vertex-client.ts';
// @ts-ignore
import pdf from 'npm:pdf-parse@1.1.1';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { filePath, textContent } = await req.json();

        if (!filePath) {
            throw new Error('Missing filePath');
        }

        console.log(`[ingest-textbook] Processing: ${filePath}`);

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let fullText = '';

        if (textContent) {
            console.log(`[ingest-textbook] Received text content (${textContent.length} chars) from client`);
            fullText = textContent;
        } else {
            console.log('[ingest-textbook] No text provided, attempting server-side parse...');
            // 1. Download PDF
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('textbooks')
                .download(filePath);

            if (downloadError) throw downloadError;

            // 2. Parse PDF Text
            const arrayBuffer = await fileData.arrayBuffer();
            // @ts-ignore
            const buffer = Buffer.from(arrayBuffer);
            const pdfData = await pdf(buffer);
            fullText = pdfData.text;
        }

        console.log(`[ingest-textbook] Ready to chunk ${fullText.length} characters`);

        // Get textbook ID from DB to link chunks
        const { data: textbook, error: tbError } = await supabase
            .from('textbooks')
            .select('id')
            .eq('file_path', filePath)
            .single();

        if (tbError) throw tbError;

        // 3. Chunk Text (Simple sliding window)
        const CHUNK_SIZE = 1000;
        const OVERLAP = 200;
        const chunks: string[] = [];

        for (let i = 0; i < fullText.length; i += (CHUNK_SIZE - OVERLAP)) {
            chunks.push(fullText.slice(i, i + CHUNK_SIZE));
        }

        console.log(`[ingest-textbook] Created ${chunks.length} chunks`);

        // 4. Generate Embeddings & Store (in batches)
        // Gemini rate limit is restrictive, so we do it serially or small batches
        let processed = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];

            // Clean text
            const cleanText = chunkText.replace(/\s+/g, ' ').trim();
            if (cleanText.length < 50) continue; // Skip tiny chunks

            try {
                // Generate Embedding
                const embedding = await embedText(cleanText);

                // Insert into DB
                const { error: insertError } = await supabase
                    .from('textbook_chunks')
                    .insert({
                        textbook_id: textbook.id,
                        content: cleanText,
                        chunk_index: i,
                        embedding: `[${embedding.join(',')}]` // Format as vector string
                    });

                if (insertError) throw insertError;
                processed++;

            } catch (err) {
                console.error(`Error processing chunk ${i}:`, err);
                // Continue with next chunk
            }

            // Simple rate limit helper
            if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 5. Update Status
        await supabase
            .from('textbooks')
            .update({ status: 'ready' })
            .eq('id', textbook.id);

        return new Response(JSON.stringify({ success: true, chunks: processed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Ingest Error:', error);

        // Try to update DB with error
        /*
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        // ... update status='error'
        */

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
