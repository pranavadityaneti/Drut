// Shared RAG helper for question-generation edge functions.
//
// Embeds the user query, runs vector similarity against `textbook_chunks`,
// and returns a CONTEXT block that can be injected into the Gemini prompt.
//
// Returns chunks=[] when:
//   - textbook_chunks is empty (no PDFs ingested yet)
//   - no chunks pass the similarity threshold
//   - filters are too strict
//
// Callers should gracefully fall back to ungrounded generation when chunks=[].

import { embedText } from './vertex-client.ts';

export interface RagChunk {
    id: string;
    content: string;
    textbook_title: string;
    similarity: number;
}

export interface RagResult {
    chunks: RagChunk[];
    context: string;        // pre-formatted block ready to inject into prompt
    contextLength: number;
    mode: 'rag' | 'no-context';
}

/**
 * Normalize a free-form subject input to the canonical value used in the
 * `textbooks.subject` column. Returns null when the subject is unrecognized
 * so callers can decide whether to skip the subject filter (broaden retrieval)
 * or fail fast.
 */
export function normalizeSubject(raw?: string): string | null {
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (lower.startsWith('math')) return 'Mathematics';
    if (lower.startsWith('phys')) return 'Physics';
    if (lower.startsWith('chem')) return 'Chemistry';
    if (lower.startsWith('bio')) return 'Biology';
    return null;
}

/**
 * Build the query string used for embedding. Combines topic + subtopic + subject
 * to give the embedding model enough signal for a relevant retrieval.
 */
function buildQuery(topic: string, subtopic?: string, subject?: string | null): string {
    const parts = [subject, topic, subtopic && subtopic !== 'mixed' && subtopic !== 'Mixed' ? subtopic : null]
        .filter(Boolean);
    return parts.join(' · ');
}

/**
 * Retrieve top-K textbook chunks for the given topic. Returns a pre-formatted
 * context block plus the raw chunks for telemetry/inspection.
 *
 * @param supabase  Initialized Supabase admin client
 * @param opts.topic       Required. e.g., "Optics" or "Trigonometric Functions"
 * @param opts.subject     Optional. e.g., "Physics" — narrows to that subject's books
 * @param opts.subtopic    Optional. Appended to the query for finer retrieval
 * @param opts.classLevel  Optional. e.g., "11" or "12" — narrows to that class's books
 * @param opts.board       Optional. e.g., "NCERT" — narrows to that board
 * @param opts.matchCount  How many chunks to retrieve (default 5)
 * @param opts.threshold   Cosine similarity threshold 0..1 (default 0.5)
 */
export async function retrieveTextbookContext(
    supabase: any,
    opts: {
        topic: string;
        subject?: string | null;
        subtopic?: string;
        classLevel?: string | null;
        board?: string | null;
        matchCount?: number;
        threshold?: number;
    },
): Promise<RagResult> {
    const matchCount = opts.matchCount ?? 5;
    // Default lowered 0.5 → 0.3 on 2026-06-06: gemini-embedding-001 (our
    // current embedding model, switched after text-embedding-004 was
    // retired by Google) produces cosine similarities in a lower range
    // than the older model. With 0.5, even semantically-direct matches
    // (e.g. "Mathematics · Sets" vs the literal "Chapter 1 SETS" page)
    // were being filtered out — confirmed via smoke test 2026-06-06
    // returning chunks=0 despite 7,204 chunks live in the DB.
    const threshold = opts.threshold ?? 0.3;
    const subject = opts.subject ?? null;
    const classLevel = opts.classLevel ?? null;
    const board = opts.board ?? null;

    try {
        const query = buildQuery(opts.topic, opts.subtopic, subject);
        console.log(`[RAG] Query: "${query}" | subject=${subject} | class=${classLevel}`);

        const embedding = await embedText(query);

        const { data: chunks, error } = await supabase.rpc('match_syllabus_content', {
            query_embedding: embedding,
            match_threshold: threshold,
            match_count: matchCount,
            filter_subject: subject,
            filter_board: board,
            filter_class_level: classLevel,
        });

        if (error) {
            console.warn('[RAG] match_syllabus_content RPC failed:', error.message);
            return { chunks: [], context: '', contextLength: 0, mode: 'no-context' };
        }
        if (!chunks || chunks.length === 0) {
            console.log('[RAG] No chunks matched. (Have you ingested textbooks?)');
            return { chunks: [], context: '', contextLength: 0, mode: 'no-context' };
        }

        const formatted: RagChunk[] = chunks.map((c: any) => ({
            id: c.id,
            content: c.content,
            textbook_title: c.textbook_title,
            similarity: c.similarity,
        }));

        const context = formatted
            .map((c, i) => `[Source ${i + 1}: ${c.textbook_title}, similarity=${c.similarity.toFixed(2)}]\n${c.content}`)
            .join('\n\n---\n\n');

        console.log(`[RAG] Retrieved ${formatted.length} chunks. Top similarity: ${formatted[0].similarity.toFixed(3)}`);

        return {
            chunks: formatted,
            context,
            contextLength: context.length,
            mode: 'rag',
        };
    } catch (err) {
        console.warn('[RAG] Exception during retrieval:', err);
        return { chunks: [], context: '', contextLength: 0, mode: 'no-context' };
    }
}
