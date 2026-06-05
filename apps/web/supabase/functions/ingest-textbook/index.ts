import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { embedText, generateContent } from '../_shared/vertex-client.ts';
import JSON5 from 'https://esm.sh/json5@2.2.3';
// Phase B chunking helpers (see _shared/pdf-chunking.ts).
// HYBRID pipeline (2026-06-05 redesign): the client parses the PDF per-page
// in the browser via pdfjs-dist and sends us a `pages: [{pageNum, text}]`
// array. Server no longer parses PDFs — eliminates the unpdf dependency
// and the 256MB-memory-cap crashes it caused on 14MB+ books.
import {
    detectHeadersFooters,
    stripHeadersFooters,
    chunkByPage,
    type PageText,
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
        const { filePath, pages, skipExtraction, skipChunking } = await req.json();

        if (!filePath) {
            throw new Error('Missing filePath');
        }

        // HYBRID pipeline: client extracts per-page text in the browser via
        // pdfjs-dist and sends as `pages: [{pageNum, text}]`. Server no longer
        // parses PDFs — see top-of-file comment for rationale.
        if (!Array.isArray(pages) || pages.length === 0) {
            throw new Error(
                'Missing or empty `pages` array. Hybrid pipeline requires the client ' +
                'to extract per-page text and send as `{filePath, pages: [{pageNum, text}]}`. ' +
                'Legacy `{filePath, textContent: string}` mode is no longer supported.'
            );
        }

        console.log(`[ingest-textbook] Processing: ${filePath} (${pages.length} client-extracted pages, skipExtraction=${skipExtraction}, skipChunking=${skipChunking})`);

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let aiResponseDebug = 'N/A';
        let syllabusDebug = 'N/A';

        // ---- Normalize incoming pages array ----
        // Defensive coercion: sanitize form-feed characters (the chunker uses
        // \f as its inter-page sentinel and would corrupt the offset map if
        // any page text contained one), 1-index page numbers, ensure text is
        // a string. No PDF parsing happens server-side.
        let rawPages: PageText[] | null = pages.map((p: any, i: number) => ({
            pageNum: typeof p.pageNum === 'number' && p.pageNum > 0 ? p.pageNum : i + 1,
            text: typeof p.text === 'string' ? p.text.replace(/\f/g, ' ') : '',
        }));

        const totalChars = rawPages.reduce((acc: number, p: PageText) => acc + p.text.length, 0);
        console.log(`[ingest-textbook] Received ${rawPages.length} pages, ${totalChars} total chars`);

        // Build TOC context INCREMENTALLY (no second full-text copy in memory).
        // We only need the first ~60k chars for the AI Table-of-Contents extractor.
        let fullText = '';
        for (const p of rawPages) {
            if (fullText.length >= 60000) break;
            fullText += p.text + '\n\n';
        }
        fullText = fullText.slice(0, 60000);

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

                // TOC extraction uses Gemini 2.5 Pro (vs Flash default).
                // Runs ONCE per book upload — ~$0.005/book at current Pro
                // pricing ($1.25/M input, $10/M output). The accuracy of
                // chapter parsing (especially on messy state-board TOCs)
                // matters more than the small latency/cost increase here.
                // Other generateContent callers (question generation,
                // chunk enrichment, etc.) stay on Flash — see workflow
                // audit wx41ap18i, 2026-06-06.
                //
                // gemini-2.5-pro: GA, supports temperature=0.3 (our value)
                // and responseMimeType:'application/json'. gemini-3.1-pro-
                // preview was considered but its docs warn against lowering
                // temperature from default 1.0 — would break this call.
                const aiResponse = await generateContent(prompt, undefined, 0.3, 'gemini-2.5-pro');
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
                    // Find the subject knowledge_node this textbook belongs under, so
                    // extracted chapters nest as its children instead of orphan-ing at root.
                    //
                    // Pre-Phase-B behavior: chapters inserted with NO parent_id ->
                    // they appeared at the board level in the KnowledgeBase UI and
                    // produced the 230 orphan-chapter cleanup we did on 2026-06-05.
                    //
                    // Lookup keys MUST match the metadata key convention used by
                    // KnowledgeBase.tsx LeafFileManager (line 463 reads context.class,
                    // not context.class_level). Migration 030 was originally written
                    // with metadata.class_level but that broke uploads (textbook.class_level
                    // came in as 'general' because the spread in currentContext keyed
                    // on the wrong field). Aligned on 'class' as the metadata key here
                    // and in the migration; textbook.class_level is the DB COLUMN we
                    // match against, but the metadata KEY is 'class'.
                    const { data: subjectNode, error: lookupErr } = await supabase
                        .from('knowledge_nodes')
                        .select('id')
                        .eq('node_type', 'subject')
                        .eq('metadata->>board', textbook.board)
                        .eq('metadata->>class', textbook.class_level)
                        .eq('metadata->>subject', textbook.subject)
                        .maybeSingle();

                    if (lookupErr) {
                        console.warn(`[ingest-textbook] Subject lookup failed: ${lookupErr.message}`);
                    }

                    if (!subjectNode?.id) {
                        // Refuse to insert orphan chapters. Logging loudly so the admin
                        // can pre-create the missing subject folder and re-ingest.
                        console.warn(
                            `[ingest-textbook] No matching subject node found for ` +
                            `board=${textbook.board} class=${textbook.class_level} ` +
                            `subject=${textbook.subject}. Skipping chapter knowledge_node ` +
                            `creation to avoid orphans-at-root. Pre-create the subject ` +
                            `folder via the KnowledgeBase admin UI or migration 030.`
                        );
                    } else {
                        const nodesToInsert = syllabus.chapters.map((chap: any) => ({
                            parent_id: subjectNode.id,
                            name: chap.name,
                            node_type: 'topic',
                            metadata: {
                                textbook_id: textbook.id,
                                subject: textbook.subject,
                                board: textbook.board,
                                class: textbook.class_level,
                                is_chapter: true,
                            },
                        }));

                        const { error: nodeError } = await supabase.from('knowledge_nodes').insert(nodesToInsert);
                        if (nodeError) {
                            console.error('Error inserting chapter nodes:', nodeError);
                        } else {
                            console.log(`[ingest-textbook] Inserted ${nodesToInsert.length} chapters nested under subject ${subjectNode.id}`);
                        }
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
            const pageCountAtCheck = rawPages?.length ?? 0;
            const warning = `Only ${totalChars} chars extracted from ${pageCountAtCheck} pages (threshold ${MIN_EXTRACTED_CHARS}). PDF may be scanned/image-only.`;
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
                pages: pageCountAtCheck,
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
        const pageCount = rawPages.length;
        console.log(
            `[ingest-textbook] Stripped ${stripSummary.totalLinesStripped} lines ` +
            `across ${stripSummary.pagesAffected}/${pageCount} pages`
        );

        // 3b. Release rawPages — cleanedPages is the new source of truth.
        //     With ~15 MB per pages array on a multi-MB textbook, this is the
        //     single biggest memory win.
        rawPages = null;

        // 4. STREAMING chunk + embed — process N pages at a time, then drop the
        //    chunks so V8 can reclaim memory before the next page batch. Trade-off:
        //    chunks that would have straddled a page-batch boundary are now two
        //    chunks instead of one. With 20-page batches that's a tiny fraction of
        //    total chunks; accepted for staying under the 150 MB worker-memory cap.
        const PAGE_BATCH = 20;
        const EMBED_BATCH = 5;
        let processed = 0;
        let totalChunks = 0;
        let globalChunkIdx = 0;
        // Diagnostic counters (returned in response so we can see what's
        // failing without relying on the spotty function_logs pipeline).
        let embedFailures = 0;
        let insertFailures = 0;
        const firstInsertError: { msg?: string } = {};
        const firstEmbedError: { msg?: string } = {};
        let embeddingDimSample: number | null = null;

        for (let pageStart = 0; pageStart < cleanedPages.length; pageStart += PAGE_BATCH) {
            const pageBatch = cleanedPages.slice(pageStart, pageStart + PAGE_BATCH);
            const chunks = chunkByPage(pageBatch, {
                chunkSize: CHUNK_SIZE,
                overlap: CHUNK_OVERLAP,
                minSize: CHUNK_MIN_SIZE,
            });
            totalChunks += chunks.length;

            for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
                const batch = chunks.slice(i, i + EMBED_BATCH);

                const embedPromises = batch.map(async (chunk, batchIdx) => {
                    const localChunkIdx = globalChunkIdx + i + batchIdx;
                    try {
                        const embedding = await embedText(chunk.text);
                        if (embeddingDimSample === null) embeddingDimSample = embedding.length;
                        if (!Array.isArray(embedding) || embedding.length === 0) {
                            embedFailures++;
                            if (!firstEmbedError.msg) firstEmbedError.msg = `empty/invalid embedding (length=${embedding?.length ?? 'undefined'})`;
                            return null;
                        }
                        return {
                            textbook_id: textbook.id,
                            content: chunk.text,
                            chunk_index: localChunkIdx,
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
                    } catch (err: any) {
                        embedFailures++;
                        if (!firstEmbedError.msg) firstEmbedError.msg = String(err?.message ?? err);
                        console.error(`Embedding failed for chunk ${localChunkIdx} (pageStart=${chunk.pageStart})`, err);
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
                        insertFailures += validRows.length;
                        if (!firstInsertError.msg) firstInsertError.msg = `${insertError.code ?? ''} ${insertError.message ?? ''} ${insertError.details ?? ''} ${insertError.hint ?? ''}`.trim();
                        console.error('Batch insert error:', insertError);
                    } else {
                        processed += validRows.length;
                    }
                }
            }
            globalChunkIdx += chunks.length;
            // `chunks` goes out of scope at end of this iteration → eligible for GC.
        }

        // 5. Update Status
        await supabase
            .from('textbooks')
            .update({ status: 'ready' })
            .eq('id', textbook.id);

        return new Response(JSON.stringify({
            message: 'Ingestion complete (Phase B)',
            ingestVersion: INGEST_VERSION,
            pages: pageCount,
            totalChars,
            chunks: totalChunks,
            chunksInserted: processed,
            embedFailures,
            insertFailures,
            firstEmbedError: firstEmbedError.msg ?? null,
            firstInsertError: firstInsertError.msg ?? null,
            embeddingDimSample,
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
