import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { embedText } from '../_shared/vertex-client.ts';
// Use esm.sh for better Deno compatibility
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';
// import { YoutubeTranscript } from 'https://esm.sh/youtube-transcript@3.0.1';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { url, title, type, parentId, context } = await req.json();

        if (!url) throw new Error('Missing URL');

        console.log(`[ingest-link] Processing: ${url} (${type})`);

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let fullText = '';
        let inferredTitle = title || '';

        // 1. Fetch Content
        if (type === 'video' || url.includes('youtube.com') || url.includes('youtu.be')) {
            console.log('[ingest-link] Detected YouTube Video');
            throw new Error('YouTube Transcript Ingestion is temporarily disabled due to library compatibility. Please upload PDF notes for this video instead.');

            /*
            try {
                // Extract Text from Transcript
                // This package scrapes the auto-generated transcript
                const transcriptItems = await YoutubeTranscript.fetchTranscript(url);
                fullText = transcriptItems.map(item => item.text).join(' ');

                if (!inferredTitle) inferredTitle = 'YouTube Video'; // Hard to fetch title without API key
            } catch (err) {
                console.error('YouTube Transcript Error:', err);
                throw new Error('Could not fetch video transcript. Subtitles might be disabled.');
            }
            */
        } else {
            // Article / Web Page
            console.log('[ingest-link] Fetching Web Page');
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch URL: ${res.statusText}`);
            const html = await res.text();

            const $ = cheerio.load(html);

            // Infer title if missing
            if (!inferredTitle) {
                inferredTitle = $('title').text().trim() || 'Web Article';
            }

            // Extract Text (p tags, lists, headers)
            // Remove scripts, styles
            $('script').remove();
            $('style').remove();
            $('nav').remove();
            $('footer').remove();

            // Join paragraphs
            fullText = $('body').text().replace(/\s+/g, ' ').trim();
            // A more focused approach:
            // fullText = $('p, h1, h2, h3, li').map((i, el) => $(el).text()).get().join('\n');
        }

        if (fullText.length < 100) {
            throw new Error('Content too short or empty.');
        }

        console.log(`[ingest-link] Extracted ${fullText.length} chars.`);

        // 2. Insert into Textbooks Table (if not already done by frontend? Frontend usually does it)
        // Check if Frontend passed an ID. If not, create it.
        // Wait, Frontend usually uploads file then inserts row. Here we have no file upload.
        // So this Function OR Frontend can do it.
        // Let's assume Frontend inserts the row and passes strict context?
        // Actually, for simplicity, let's create the row HERE if param 'createRow' is true?
        // Or simply: Frontend inserts row, passes 'textbookId'.

        // Let's assume user passes 'textbookId'. If not, we create.
        let textbookId = (req as any).textbookId; // Need to check if passed in body
        // Actually, check body (Step 16 parsed body)
        // const { url, title, type, textbookId } = await req.json();

        // If frontend didn't create row, we create it.
        // But frontend Logic handles Context (Path). It's easier if Frontend creates row.
        // I will assume Frontend creates row and passes 'textbookId'.
        // If 'textbookId' is missing, I'll error.

        // RE-READING: Frontend passes 'context' and 'pathLabels'.
        // I'll stick to: Input = { textbookId, url, type? }
        // BUT wait, my previous code for `ingest-textbook` reads file from Storage.
        // Here we don't have storage file.
        // So likely we need to UPDATE the `textbook_chunks`.

        // I'll look at `ingest-textbook` again (Step 1028).
        // It selects `id` from `textbooks` where `file_path` = filePath.

        // So if Frontend inserts row with `file_path` = URL, I can look it up!

        const { data: tbMatches, error: tbError } = await supabase
            .from('textbooks')
            .select('id')
            .eq('file_path', url) // Constraints might allow duplicates?
            .order('uploaded_at', { ascending: false })
            .limit(1);

        if (tbError || !tbMatches || tbMatches.length === 0) {
            throw new Error('Textbook record not found. Please create row first.');
        }
        textbookId = tbMatches[0].id;

        // 3. Chunk & Embed
        const CHUNK_SIZE = 1000;
        const OVERLAP = 200;
        const chunks: string[] = [];
        for (let i = 0; i < fullText.length; i += (CHUNK_SIZE - OVERLAP)) {
            chunks.push(fullText.slice(i, i + CHUNK_SIZE));
        }

        console.log(`[ingest-link] Created ${chunks.length} chunks`);

        // 4. Generate Embeddings & Store
        const BATCH_SIZE = 5;
        let processed = 0;

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const embedPromises = batch.map(async (chunkText, batchIdx) => {
                const globalIdx = i + batchIdx;
                const cleanText = chunkText.replace(/\s+/g, ' ').trim();
                if (cleanText.length < 50) return null;
                try {
                    const embedding = await embedText(cleanText);
                    return {
                        textbook_id: textbookId,
                        content: cleanText,
                        chunk_index: globalIdx,
                        embedding: `[${embedding.join(',')}]`,
                        metadata: { source_type: type, url }
                    };
                } catch (err) {
                    console.error(`Embedding failed for chunk ${globalIdx}`, err);
                    return null;
                }
            });

            const results = await Promise.all(embedPromises);
            const validRows = results.filter(r => r !== null);

            if (validRows.length > 0) {
                const { error: insertError } = await supabase.from('textbook_chunks').insert(validRows);
                if (insertError) console.error('Batch insert error:', insertError);
                else processed += validRows.length;
            }
        }

        // 5. Update Status
        await supabase
            .from('textbooks')
            .update({ status: 'ready', title: inferredTitle || title }) // Update title if we fetched a better one
            .eq('id', textbookId);

        return new Response(JSON.stringify({ success: true, chunks: processed, title: inferredTitle }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Ingest Link Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
