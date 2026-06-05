import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { embedText, generateContent } from '../_shared/vertex-client.ts';
import JSON5 from 'https://esm.sh/json5@2.2.3';
// Phase B chunking helpers (see _shared/pdf-chunking.ts). Replaces direct
// pdf-parse usage so we get page-aware extraction + de-noising.
import {
    extractPagesFromPdf,
    assertNoFormFeedCollision,
    detectHeadersFooters,
    stripHeadersFooters,
    chunkByPage,
} from '../_shared/pdf-chunking.ts';

// Aggregate-text-length threshold for scanned-PDF detection. If extraction
// returns less than this many characters total, mark the textbook as
// 'partial-extraction' so the admin sees a flag (likely an image-only/scanned
// PDF that needs OCR). Picked conservatively: even a 5-page textbook should
// easily exceed this.
const MIN_EXTRACTED_CHARS = 5000;

// Phase B chunking parameters. See _shared/pdf-chunking.ts JSDoc for
// rationale on overlap reduction from 200 (Phase A) to 100.
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;
const CHUNK_MIN_SIZE = 200;

// Tag every chunk produced by this version of the pipeline so future code
// can distinguish Phase A vs Phase B vs later chunks in the same table.
const INGEST_VERSION = 'phase-b-v1';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { filePath, skipExtraction, skipChunking } = await req.json();
        // Note: `textContent` field accepted but IGNORED in Phase B v1. Page-aware
        // extraction requires server-side parsing — we cannot reconstruct page
        // boundaries from a client-provided merged string. TextbookManager still
        // sends the field; we just don't read it here.

        if (!filePath) {
            throw new Error('Missing filePath');
        }

        console.log(`[ingest-textbook] Processing: ${filePath} (skipExtraction: ${skipExtraction}, skipChunking: ${skipChunking})`);

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let aiResponseDebug = 'N/A';
        let syllabusDebug = 'N/A';

        // ---- Server-side page-aware extraction (Phase B) ----
        console.log('[ingest-textbook] Downloading PDF from storage...');
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('textbooks')
            .download(filePath);

        if (downloadError) throw downloadError;

        const arrayBuffer = await fileData.arrayBuffer();
        console.log(`[ingest-textbook] PDF downloaded (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB). Parsing per-page with unpdf...`);

        const rawPages = await extractPagesFromPdf(arrayBuffer);
        assertNoFormFeedCollision(rawPages);
        const totalChars = rawPages.reduce((acc, p) => acc + p.text.length, 0);
        console.log(`[ingest-textbook] Extracted ${rawPages.length} pages, ${totalChars} total chars`);

        // fullText (concatenated, for legacy code paths like the AI TOC extractor).
        // Use \n\n between pages — TOC extractor doesn't care about page boundaries.
        const fullText = rawPages.map(p => p.text).join('\n\n');

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

        // ---- Phase B: header/footer de-noising + page-aware chunking ----

        // 1. Aggregate-text validation (scanned-PDF detection).
        //    If extraction returned ~nothing, mark partial-extraction and bail
        //    BEFORE wasting embedding API calls. Admin sees the flag on the
        //    textbook row and can decide whether to OCR + re-upload.
        if (totalChars < MIN_EXTRACTED_CHARS) {
            const warning = `Only ${totalChars} chars extracted from ${rawPages.length} pages (threshold ${MIN_EXTRACTED_CHARS}). PDF may be scanned/image-only.`;
            console.warn(`[ingest-textbook] ${warning}`);
            await supabase
                .from('textbooks')
                .update({
                    status: 'partial-extraction',
                    error_message: warning,
                })
                .eq('id', textbook.id);
            return new Response(JSON.stringify({
                message: 'Partial extraction — no chunks generated',
                warning,
                pages: rawPages.length,
                totalChars,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Detect headers/footers across the whole book (frequency-based blocklist).
        const blocklist = detectHeadersFooters(rawPages);
        console.log(`[ingest-textbook] Header/footer blocklist size: ${blocklist.size}`);

        // 3. Strip headers/footers + page numbers from each page.
        const { pages: cleanedPages, logs: stripLogs, summary: stripSummary } =
            stripHeadersFooters(rawPages, blocklist);
        stripLogs.forEach(l => console.log(l));
        console.log(
            `[ingest-textbook] Stripped ${stripSummary.totalLinesStripped} lines ` +
            `across ${stripSummary.pagesAffected}/${rawPages.length} pages`
        );

        // 4. Page-aware chunking — chunks now carry pageStart/pageEnd.
        const phaseBChunks = chunkByPage(cleanedPages, {
            chunkSize: CHUNK_SIZE,
            overlap: CHUNK_OVERLAP,
            minSize: CHUNK_MIN_SIZE,
        });

        console.log(
            `[ingest-textbook] Created ${phaseBChunks.length} chunks ` +
            `(size=${CHUNK_SIZE}, overlap=${CHUNK_OVERLAP}, min=${CHUNK_MIN_SIZE})`
        );

        // 5. Generate Embeddings & Store (in batches).
        //    Same BATCH_SIZE=5 + Promise.all pattern as Phase A — only the per-chunk
        //    shape changed (now carries page_start, page_end, ingest_version).
        const BATCH_SIZE = 5;
        let processed = 0;

        for (let i = 0; i < phaseBChunks.length; i += BATCH_SIZE) {
            const batch = phaseBChunks.slice(i, i + BATCH_SIZE);

            const embedPromises = batch.map(async (chunk, batchIdx) => {
                const globalIdx = i + batchIdx;
                try {
                    const embedding = await embedText(chunk.text);
                    return {
                        textbook_id: textbook.id,
                        content: chunk.text,
                        chunk_index: globalIdx,
                        page_number: chunk.pageStart,
                        embedding: `[${embedding.join(',')}]`,
                        metadata: {
                            ingest_version: INGEST_VERSION,
                            page_start: chunk.pageStart,
                            page_end: chunk.pageEnd,
                            char_count: chunk.charCount,
                            subject: textbook.subject,
                            board: textbook.board,
                            class_level: textbook.class_level,
                        },
                    };
                } catch (err) {
                    console.error(`Embedding failed for chunk ${globalIdx} (pageStart=${chunk.pageStart})`, err);
                    return null;
                }
            });

            const results = await Promise.all(embedPromises);
            const validRows = results.filter(r => r !== null);

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

        // 6. Update Status
        await supabase
            .from('textbooks')
            .update({ status: 'ready' })
            .eq('id', textbook.id);

        return new Response(JSON.stringify({
            message: 'Ingestion complete (Phase B)',
            ingestVersion: INGEST_VERSION,
            pages: rawPages.length,
            totalChars,
            chunks: phaseBChunks.length,
            chunksInserted: processed,
            stripSummary,
            blocklistSize: blocklist.size,
            extractionDebug: {
                aiResponse: aiResponseDebug,
                syllabus: syllabusDebug,
            },
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
