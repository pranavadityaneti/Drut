// Chapter source resolution — walks knowledge_nodes parent chain to group
// chapters by their (board, class, subject) source so the practice/sprint
// picker can show "NCERT Class 11 Mathematics → Chapter 1: Sets" instead of
// a flat dropdown where the same chapter number appears 8 times from 8
// different textbooks.
//
// Shared between web (PracticeSetup.tsx, SprintSetup.tsx) and mobile
// (practice.tsx, sprint.tsx) so the picker logic doesn't drift.

import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

export interface ChapterEntry {
    id: string;
    name: string;
    metadata?: any;
}

/**
 * Map an exam profile to its primary state board.
 *
 * The Board picker was removed from the practice/sprint setup (PR v2)
 * because the exam choice implies the board:
 *   - AP EAPCET → BIEAP (Andhra Pradesh state board)
 *   - TS EAPCET → TSBIE (Telangana state board)
 *   - Everything else (JEE/NEET/CAT/…) → NCERT (national)
 *
 * When the primary board has no chapters ingested for the selected
 * subject (e.g., BIEAP Chemistry not yet ingested), the picker silently
 * falls back to NCERT and surfaces a small footnote to the user.
 */
export function getPrimaryBoardForExam(examProfile: string): string {
    if (examProfile === 'ap_eapcet') return 'BIEAP';
    if (examProfile === 'ts_eapcet') return 'TSBIE';
    return 'NCERT';
}

/**
 * Class naming differs by board: NCERT uses "Class 11" / "Class 12",
 * state boards (BIEAP/TSBIE) use "1st Year" / "2nd Year". The picker
 * surfaces a normalized "Class 11" / "Class 12" / "Both" choice; this
 * helper matches a source's class_name against that selection.
 */
export function classMatchesSelection(sourceClass: string, selection: string): boolean {
    if (selection === 'Both') return true;
    if (selection === 'Class 11') return sourceClass === 'Class 11' || sourceClass === '1st Year';
    if (selection === 'Class 12') return sourceClass === 'Class 12' || sourceClass === '2nd Year';
    return sourceClass === selection;
}

export interface ChapterSource {
    subject_id: string;          // knowledge_nodes.id of the subject node
    subject: string;             // e.g., "Mathematics"
    class_name: string;          // e.g., "Class 11" or "1st Year"
    board: string;               // e.g., "NCERT" or "BIEAP"
    chapters: ChapterEntry[];    // sorted alphabetically by name
}

interface NodeRow {
    id: string;
    name: string;
    parent_id: string | null;
    node_type: string;
    metadata: any;
}

/**
 * Fetch chapter sources grouped by (board × class × subject).
 *
 * Each ChapterSource represents one ingested textbook surface — e.g.,
 * "NCERT × Class 11 × Mathematics" or "BIEAP × 1st Year × Physics" — and
 * carries the chapters available under that source.
 *
 * Optional filters narrow the result:
 *   - subject:    "Mathematics" | "Physics" | "Chemistry" (or any subject name)
 *   - userClass:  "Class 11" | "Class 12" | "1st Year" | "2nd Year"
 *   - userBoard:  "NCERT" | "BIEAP" | ...
 *
 * Returns empty array on any DB error (logs the error). Callers should
 * treat empty as "no chapters available for this selection" — not as
 * "service failed."
 *
 * Implementation note: queries all knowledge_nodes in one round-trip and
 * builds the parent walk in JS. Drut's knowledge tree is small (~150
 * nodes today, well under a few thousand even at full curriculum scope)
 * so this is fine; if it ever grows past 10k, switch to a SQL RPC with
 * a recursive CTE.
 */
export async function fetchChapterSources(
    subject?: string,
    userClass?: string,
    userBoard?: string,
): Promise<ChapterSource[]> {
    const supabase = getSupabase();
    if (!supabase) {
        log.warn('[chapterService] Supabase client not available');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('knowledge_nodes')
            .select('id, name, parent_id, node_type, metadata');

        if (error) {
            log.error('[chapterService] fetchChapterSources failed:', error.message);
            return [];
        }
        if (!data || data.length === 0) return [];

        const nodes = data as NodeRow[];
        const byId = new Map<string, NodeRow>();
        for (const n of nodes) byId.set(n.id, n);

        // Walk topic → subject → class → board for each topic node.
        // A topic without a complete chain (missing parent at any level)
        // is skipped — it shouldn't appear in the picker because we can't
        // label its source.
        const grouped = new Map<string, ChapterSource>();

        for (const topic of nodes) {
            if (topic.node_type !== 'topic') continue;
            if (!topic.parent_id) continue;

            const subjectNode = byId.get(topic.parent_id);
            if (!subjectNode || subjectNode.node_type !== 'subject') continue;
            if (!subjectNode.parent_id) continue;

            const classNode = byId.get(subjectNode.parent_id);
            if (!classNode) continue;
            if (!classNode.parent_id) continue;

            const boardNode = byId.get(classNode.parent_id);
            if (!boardNode) continue;

            // Apply filters
            if (subject && subjectNode.name !== subject) continue;
            if (userClass && classNode.name !== userClass) continue;
            if (userBoard && boardNode.name !== userBoard) continue;

            // Group key — one bucket per (board, class, subject) triple
            const key = `${boardNode.id}|${classNode.id}|${subjectNode.id}`;
            let bucket = grouped.get(key);
            if (!bucket) {
                bucket = {
                    subject_id: subjectNode.id,
                    subject: subjectNode.name,
                    class_name: classNode.name,
                    board: boardNode.name,
                    chapters: [],
                };
                grouped.set(key, bucket);
            }
            bucket.chapters.push({
                id: topic.id,
                name: topic.name,
                metadata: topic.metadata,
            });
        }

        // Sort chapters alphabetically within each bucket, and sort buckets
        // by board → class → subject for stable picker order.
        const sources = Array.from(grouped.values());
        for (const s of sources) {
            s.chapters.sort((a, b) => a.name.localeCompare(b.name));
        }
        sources.sort((a, b) => {
            if (a.board !== b.board) return a.board.localeCompare(b.board);
            if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
            return a.subject.localeCompare(b.subject);
        });

        return sources;
    } catch (err: any) {
        log.error('[chapterService] Exception:', err?.message || err);
        return [];
    }
}
