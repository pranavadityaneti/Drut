// Chapter source resolution for the practice/sprint chapter picker.
//
// SINGLE SOURCE OF TRUTH: chapters come from EXAM_TAXONOMY (the canonical AP
// EAPCET syllabus, reconciled from the official syllabus + BIEAP textbook TOCs —
// see docs/ap-eapcet-taxonomy-analysis.html). We do NOT read knowledge_nodes for
// the picker anymore (it was incomplete and mixed NCERT names in). knowledge_nodes
// remains only for RAG textbook linkage, never the picker.
//
// EAPCET (AP + TG) share one syllabus, surfaced under a single "EAPCET" board, so
// NCERT is never offered for EAPCET. Shared by web (PracticeSetup, SprintSetup)
// and mobile (practice.tsx) so the picker can't drift.

import { EXAM_TAXONOMY } from '../lib/taxonomy';

export interface ChapterEntry {
    id: string;
    name: string;
    metadata?: any;
}

/**
 * Map an exam profile to its picker "board".
 *
 * EAPCET (AP + TG) → a single "EAPCET" board (one shared syllabus from
 * EXAM_TAXONOMY). Everything else (JEE/NEET/…) → NCERT. The board concept is now
 * vestigial for EAPCET (one syllabus, no NCERT fallback), but kept so the
 * existing picker board-match logic continues to work unchanged.
 */
export function getPrimaryBoardForExam(examProfile: string): string {
    if (examProfile === 'ap_eapcet' || examProfile === 'ts_eapcet') return 'EAPCET';
    return 'NCERT';
}

/**
 * Class naming: the picker surfaces "Class 11" / "Class 12" / "Both". Sources are
 * labelled "Class 11" / "Class 12" (from EXAM_TAXONOMY class_level). Kept tolerant
 * of legacy "1st Year" / "2nd Year" labels too.
 */
export function classMatchesSelection(sourceClass: string, selection: string): boolean {
    if (selection === 'Both') return true;
    if (selection === 'Class 11') return sourceClass === 'Class 11' || sourceClass === '1st Year';
    if (selection === 'Class 12') return sourceClass === 'Class 12' || sourceClass === '2nd Year';
    return sourceClass === selection;
}

export interface ChapterSource {
    subject_id: string;          // stable key (subject name)
    subject: string;             // e.g., "Mathematics"
    class_name: string;          // "Class 11" | "Class 12"
    board: string;               // "EAPCET"
    chapters: ChapterEntry[];    // canonical bare-label chapters, sorted by name
}

// EAPCET syllabus = the shared topic list on the ap_eapcet exam (ts_eapcet shares it).
const EAPCET_TOPICS = EXAM_TAXONOMY.find(e => e.value === 'ap_eapcet')?.topics || [];

/**
 * Build chapter sources for the picker from the canonical EXAM_TAXONOMY.
 *
 * Each ChapterSource = one (EAPCET board × class × subject) bucket carrying its
 * canonical bare-label chapters. NCERT is never produced for EAPCET. Signature
 * (async + optional filters) preserved so existing callers are unchanged.
 */
export async function fetchChapterSources(
    subject?: string,
    userClass?: string,
    userBoard?: string,
): Promise<ChapterSource[]> {
    if (userBoard && userBoard !== 'EAPCET') return [];

    const byKey = new Map<string, ChapterSource>();
    for (const t of EAPCET_TOPICS) {
        if (subject && t.subject !== subject) continue;
        const class_name = t.class_level === '12' ? 'Class 12' : 'Class 11';
        if (userClass && !classMatchesSelection(class_name, userClass) && class_name !== userClass) continue;
        const key = `${t.subject}|${class_name}`;
        let bucket = byKey.get(key);
        if (!bucket) {
            bucket = { subject_id: t.subject, subject: t.subject, class_name, board: 'EAPCET', chapters: [] };
            byKey.set(key, bucket);
        }
        // label IS the canonical topic string (what serving matches); id = kebab value.
        bucket.chapters.push({ id: t.value, name: t.label });
    }

    const sources = Array.from(byKey.values());
    for (const s of sources) s.chapters.sort((a, b) => a.name.localeCompare(b.name));
    sources.sort((a, b) => {
        if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
        return a.subject.localeCompare(b.subject);
    });
    return sources;
}
