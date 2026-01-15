import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Buffer } from 'node:buffer';
import { corsHeaders } from '../_shared/cors.ts';
import { embedText, generateContent } from '../_shared/vertex-client.ts';
import JSON5 from 'https://esm.sh/json5@2.2.3';
// @ts-ignore
import pdf from 'npm:pdf-parse@1.1.1';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { filePath, textContent, skipExtraction, skipChunking } = await req.json();

        if (!filePath) {
            throw new Error('Missing filePath');
        }

        console.log(`[ingest-textbook] Processing: ${filePath} (skipExtraction: ${skipExtraction}, skipChunking: ${skipChunking})`);

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let fullText = '';
        let aiResponseDebug = 'N/A';
        let syllabusDebug = 'N/A';

        if (textContent) {
            console.log(`[ingest-textbook] Received text content (${textContent.length} chars) from client`);
            fullText = textContent;
        } else {
            console.log('[ingest-textbook] No text provided, attempting server-side parse...');
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('textbooks')
                .download(filePath);

            if (downloadError) throw downloadError;

            const arrayBuffer = await fileData.arrayBuffer();
            // @ts-ignore
            const buffer = Buffer.from(arrayBuffer);
            const pdfData = await pdf(buffer);
            fullText = pdfData.text;
        }

        // Get textbook metadata
        const { data: textbook, error: tbError } = await supabase
            .from('textbooks')
            .select('id, subject, class_level, board')
            .eq('file_path', filePath)
            .single();

        if (tbError) throw tbError;

        // --- DYNAMIC SYLLABUS EXTRACTION ---
        // Only run if not explicitly skipped (to allow re-runs of just this part if needed)
        if (!skipExtraction) {
            console.log('[ingest-textbook] Attempting to extract Table of Contents...');
            try {
                // Heuristic: TOC is usually in the first 60k chars
                const tocContext = fullText.slice(0, 60000);
                const prompt = `
                    You are a syllabus extractor. I will provide the beginning of a textbook.
                    Your goal is to extract the Chapter Names and their Topics from the Table of Contents.
                    
                    The TOC might be messy (e.g. "1.Locus9 - 16" -> Chapter 1: Locus).
                    Please parse messy lines intelligently to find the chapter title.

                    Return ONLY a JSON object with this structure:
                    {
                        "chapters": [
                            {
                                "name": "Chapter 1: Sets",
                                "topics": ["Introduction", "Sets and their Representations", "The Empty Set"]
                            }
                        ]
                    }

                    Do NOT use Markdown. Just raw JSON.
                    
                    TEXTBOOK START:
                    ${tocContext}
                `;

                const aiResponse = await generateContent(prompt);
                console.log('[ingest-textbook] AI Response (Length):', aiResponse.length);
                aiResponseDebug = aiResponse; // Capture RAW response immediately

                // Aggressive Cleanup
                const cleanJson = aiResponse
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .trim();

                let syllabus;
                try {
                    syllabus = JSON5.parse(cleanJson);
                } catch (e) {
                    console.log("[ingest-textbook] JSON5 Parse failed, trying aggressive repair...");
                    // Fallback: Try to find the first { and last } or closing ]
                    const firstBrace = cleanJson.indexOf('{');
                    // If terminated string error, maybe the last brace is missing?
                    // We try to find the last valid `}` or `]`?
                    // Simplest repair: Just try parsing the substring up to the last `}` found.
                    const lastBrace = cleanJson.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        const jsonSubstring = cleanJson.substring(firstBrace, lastBrace + 1);
                        console.log('[ingest-textbook] Attempting to parse substring:', jsonSubstring.length);
                        syllabus = JSON5.parse(jsonSubstring);
                    } else {
                        throw e;
                    }
                }

                syllabusDebug = syllabus;

                if (syllabus.chapters && syllabus.chapters.length > 0) {
                    const nodesToInsert: any[] = [];
                    for (const chap of syllabus.chapters) {
                        nodesToInsert.push({
                            name: chap.name,
                            node_type: 'topic',
                            metadata: {
                                textbook_id: textbook.id,
                                subject: textbook.subject,
                                is_chapter: true
                            },
                        });
                    }

                    if (nodesToInsert.length > 0) {
                        const { error: nodeError } = await supabase.from('knowledge_nodes').insert(nodesToInsert);
                        if (nodeError) console.error('Error inserting nodes:', nodeError);
                        else console.log(`[ingest-textbook] Inserted ${nodesToInsert.length} chapters into knowledge_nodes`);
                    }
                }

            } catch (err) {
                console.error('[ingest-textbook] Syllabus extraction failed (non-blocking):', err);
                // Keep aiResponseDebug as the raw text if available
                if (aiResponseDebug === 'N/A') aiResponseDebug = 'Error: ' + err.message;
            }
        }
        // -----------------------------------

        // SKIP CHUNKING check
        if (skipChunking) {
            console.log('[ingest-textbook] Skipping chunking/embedding as requested.');
            return new Response(JSON.stringify({
                message: 'Syllabus extraction complete (chunking skipped)',
                extractionDebug: {
                    aiResponse: aiResponseDebug,
                    syllabus: syllabusDebug
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[ingest-textbook] Ready to chunk ${fullText.length} characters`);

        // ... (Existing Chunking Logic) ...
        const CHUNK_SIZE = 1000;
        const OVERLAP = 200;
        const chunks: string[] = [];

        for (let i = 0; i < fullText.length; i += (CHUNK_SIZE - OVERLAP)) {
            chunks.push(fullText.slice(i, i + CHUNK_SIZE));
        }

        console.log(`[ingest-textbook] Created ${chunks.length} chunks`);

        // 4. Generate Embeddings & Store (in batches)
        // Parallelize embeddings to speed up processing
        const BATCH_SIZE = 5; // Process 5 chunks at a time (Limit checks)
        let processed = 0;

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);

            // 1. Generate Embeddings in Parallel
            const embedPromises = batch.map(async (chunkText, batchIdx) => {
                const globalIdx = i + batchIdx;
                const cleanText = chunkText.replace(/\s+/g, ' ').trim();

                if (cleanText.length < 50) return null;

                try {
                    const embedding = await embedText(cleanText);
                    return {
                        textbook_id: textbook.id,
                        content: cleanText,
                        chunk_index: globalIdx,
                        embedding: `[${embedding.join(',')}]`
                    };
                } catch (err) {
                    console.error(`Embedding failed for chunk ${globalIdx}`, err);
                    return null;
                }
            });

            const results = await Promise.all(embedPromises);
            const validRows = results.filter(r => r !== null);

            // 2. Batch Insert into DB
            if (validRows.length > 0) {
                const { error: insertError } = await supabase
                    .from('textbook_chunks')
                    .insert(validRows);

                if (insertError) {
                    console.error('Batch insert error:', insertError);
                } else {
                    processed += validRows.length;
                }
            }
        }

        // 5. Update Status
        await supabase
            .from('textbooks')
            .update({ status: 'ready' })
            .eq('id', textbook.id);

        return new Response(JSON.stringify({
            message: 'Ingestion complete',
            chunks: chunks.length,
            extractionDebug: {
                aiResponse: aiResponseDebug,
                syllabus: syllabusDebug
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Ingest Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
