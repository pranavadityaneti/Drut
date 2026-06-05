// Phase B chunking helpers — header/footer de-noising and page-aware
// chunking that preserves page_number per chunk.
//
// Pure functions, no I/O or DB dependencies, NO PDF parsing dependencies.
// PDF parsing now happens in the BROWSER (pdfjs-dist already loaded by
// LeafFileManager); the client sends an extracted `pages: [{pageNum, text}]`
// array to ingest-textbook. This file is now PDF-library-free, which keeps
// the edge function's resident memory tiny enough to comfortably fit under
// Supabase's 256MB Edge Function memory cap.
//
// Used by: apps/web/supabase/functions/ingest-textbook/index.ts
// Spec: see board-value-audit + phase-b-chunking-design workflows
//       (2026-06-05) + hybrid pipeline redesign (2026-06-05 evening).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageText {
    /** 1-indexed page number as it appears in the PDF reader. */
    pageNum: number;
    /** Raw text content of the page; '' for image-only/scanned pages. */
    text: string;
}

export interface Chunk {
    /** Final chunk text — header/footer stripped + whitespace-normalized. */
    text: string;
    /** 1-indexed page where the chunk starts. */
    pageStart: number;
    /** 1-indexed page where the chunk ends (== pageStart if chunk fits on one page). */
    pageEnd: number;
    /** Character count of `text` after normalization. */
    charCount: number;
}

// NOTE: PDF parsing functions (extractPagesFromPdf, assertNoFormFeedCollision)
// were removed in the 2026-06-05 hybrid-pipeline redesign. PDF parsing now
// happens in the client (apps/web/components/admin/KnowledgeBase.tsx
// LeafFileManager) via pdfjs-dist which is already loaded in the browser.
// Server receives the per-page array and sanitizes any \f form-feed chars
// inline (see ingest-textbook/index.ts) so no assertion helper is needed.

// ---------------------------------------------------------------------------
// Header / footer detection (Lin 2003 adapted, frequency-based)
// ---------------------------------------------------------------------------

/**
 * Normalize a candidate line into a signature for cross-page matching.
 * Lowercase + strip digits + strip punctuation + collapse whitespace.
 * "— 47 —" / "47" / "Page 47" all collapse to the same family for the
 * regex page-number pass; this normalizer handles the residual textual
 * headers ("PHYSICS - CLASS 11", "CHAPTER 3 — KINEMATICS").
 */
function normalizeSignature(line: string): string {
    return line
        .toLowerCase()
        .replace(/\d+/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Top-N + bottom-N non-empty lines of a page (the header/footer zones). */
function getZoneLines(text: string, n: number): { top: string[]; bottom: string[] } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return {
        top: lines.slice(0, n),
        bottom: lines.slice(-n),
    };
}

/**
 * Build the header/footer blocklist by frequency across pages.
 *
 * Adaptive threshold by document length:
 *   N >= 20 pages: signature must appear in same zone on ≥50% of pages
 *   N in 10..19:   ≥60%
 *   N in 5..9:     ≥70%
 *   N < 5:         frequency detection disabled — relies on regex page-number pass
 *
 * Hard floor: a signature must appear on at least 3 distinct pages (2 for N<5
 * if lenientForShortDocs is set) regardless of the percentage — prevents rounding
 * edge cases (e.g. 70% of 5 pages = 3.5 → rounds to 4 → false-positive a coincidence).
 *
 * Zone matters: a line that appears at the TOP of one page and BOTTOM of another
 * is NOT collapsed — these are tracked as separate keys ('top:<sig>' vs 'bottom:<sig>').
 *
 * Signatures < 3 chars are dropped (after digit-stripping a page number can
 * normalize to '' and would otherwise inflate counts).
 */
export function detectHeadersFooters(
    pages: PageText[],
    options: { lenientForShortDocs?: boolean } = {}
): Set<string> {
    const N = pages.length;
    if (N < 5) return new Set(); // Frequency detection disabled for tiny books

    let thresholdPct: number;
    if (N >= 20) thresholdPct = 0.50;
    else if (N >= 10) thresholdPct = 0.60;
    else thresholdPct = 0.70;

    const minDistinctPages = options.lenientForShortDocs && N < 5 ? 2 : 3;

    // sig key -> set of distinct page numbers it appears on
    const counts = new Map<string, Set<number>>();

    for (const page of pages) {
        const { top, bottom } = getZoneLines(page.text, 2);
        // De-dup within a single page so a line appearing twice on one page
        // counts only once toward the cross-page frequency.
        const seenOnPage = new Set<string>();

        const tally = (line: string, zone: 'top' | 'bottom') => {
            const sig = normalizeSignature(line);
            if (sig.length < 3) return;
            const key = `${zone}:${sig}`;
            if (seenOnPage.has(key)) return;
            seenOnPage.add(key);
            if (!counts.has(key)) counts.set(key, new Set());
            counts.get(key)!.add(page.pageNum);
        };

        top.forEach(l => tally(l, 'top'));
        bottom.forEach(l => tally(l, 'bottom'));
    }

    const minCount = Math.max(minDistinctPages, Math.ceil(N * thresholdPct));
    const blocklist = new Set<string>();
    for (const [key, pagesSet] of counts) {
        if (pagesSet.size >= minCount) blocklist.add(key);
    }
    return blocklist;
}

// ---------------------------------------------------------------------------
// Header / footer / page-number stripping
// ---------------------------------------------------------------------------

/** Patterns that match a page-number line (independent of frequency blocklist). */
const PAGE_NUMBER_PATTERNS = [
    /^\s*\d{1,4}\s*$/,                              // "47"
    /^\s*[-—–|·]+\s*\d{1,4}\s*[-—–|·]+\s*$/,        // "— 47 —", "| 47 |", "· 47 ·"
    /^\s*page\s+\d{1,4}\s*(of\s+\d{1,4}\s*)?$/i,    // "Page 47" or "Page 47 of 320"
    /^\s*\d{1,4}\s*[|/·]\s*.{1,30}\s*$/,            // "47 | Physics" — short trailing label
];

function isPageNumberLine(line: string): boolean {
    const trimmed = line.trim();
    return PAGE_NUMBER_PATTERNS.some(re => re.test(trimmed));
}

/**
 * Strip headers, footers, and page numbers from each page.
 *
 * Stripping is zone-restricted: only the top-most and bottom-most non-empty
 * lines of each page are candidates. Body text in the middle is never touched.
 *
 * Safety caps:
 *  - max 3 lines stripped per zone per page (prevents runaway over-stripping
 *    on layout glitches that put many candidate-looking lines in a zone)
 *  - if stripping empties the page entirely, the original page is restored
 *    (catches misclassification on figure-only or chapter-title pages)
 *
 * Logging: emits a per-page log line for the first `maxLogLines` affected
 * pages, plus a summary in `summary`. Prevents log spam on 320-page books.
 */
export function stripHeadersFooters(
    pages: PageText[],
    blocklist: Set<string>,
    options: { maxLogLines?: number } = {}
): {
    pages: PageText[];
    logs: string[];
    summary: { totalLinesStripped: number; pagesAffected: number };
} {
    const MAX_STRIPS_PER_ZONE = 3;
    const maxLogLines = options.maxLogLines ?? 10;
    const logs: string[] = [];
    let totalLinesStripped = 0;
    let pagesAffected = 0;
    let logsEmitted = 0;

    const cleaned = pages.map(page => {
        const lines = page.text.split('\n');
        const originalText = page.text;
        let topStripped = 0;
        let bottomStripped = 0;

        // ---- TOP zone: walk forward, strip while matches; stop at first non-strippable.
        for (let i = 0; i < lines.length && topStripped < MAX_STRIPS_PER_ZONE; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.length === 0) continue; // skip blank lines, don't count

            const sig = normalizeSignature(trimmed);
            const isBlocked = sig.length >= 3 && blocklist.has(`top:${sig}`);
            const isPageNum = isPageNumberLine(trimmed);

            if (isBlocked || isPageNum) {
                lines[i] = '';
                topStripped++;
            } else {
                break; // First real content line — stop the top-zone walk
            }
        }

        // ---- BOTTOM zone: mirror — walk backward.
        for (let i = lines.length - 1; i >= 0 && bottomStripped < MAX_STRIPS_PER_ZONE; i--) {
            const trimmed = lines[i].trim();
            if (trimmed.length === 0) continue;

            const sig = normalizeSignature(trimmed);
            const isBlocked = sig.length >= 3 && blocklist.has(`bottom:${sig}`);
            const isPageNum = isPageNumberLine(trimmed);

            if (isBlocked || isPageNum) {
                lines[i] = '';
                bottomStripped++;
            } else {
                break;
            }
        }

        const newText = lines.join('\n');
        const stripped = topStripped + bottomStripped;

        // Safety restore: if stripping killed all real content, revert.
        const newCharCount = newText.replace(/\s+/g, '').length;
        const origCharCount = originalText.replace(/\s+/g, '').length;
        if (newCharCount === 0 && origCharCount > 0) {
            return { pageNum: page.pageNum, text: originalText };
        }

        if (stripped > 0) {
            totalLinesStripped += stripped;
            pagesAffected++;
            if (logsEmitted < maxLogLines) {
                logs.push(`[strip] page=${page.pageNum} top=${topStripped} bottom=${bottomStripped}`);
                logsEmitted++;
            }
        }

        return { pageNum: page.pageNum, text: newText };
    });

    return {
        pages: cleaned,
        logs,
        summary: { totalLinesStripped, pagesAffected },
    };
}

// ---------------------------------------------------------------------------
// Chunking with page tracking
// ---------------------------------------------------------------------------

const PAGE_SEPARATOR = '\f';

/**
 * Chunk pages into ~chunkSize-char windows with `overlap` chars of overlap.
 * Records pageStart / pageEnd per chunk so callers can store page_number
 * (using pageStart as the primary page) and a metadata.page_end for chunks
 * that straddle a page boundary.
 *
 * Why chunk across page boundaries: a 1000-char target on a 700-char page
 * would otherwise produce tiny tail-chunks. Cross-page chunks preserve
 * semantic continuity (a paragraph that wraps from page 12 to page 13 stays
 * in one chunk, pageStart=12 pageEnd=13).
 *
 * Defaults match the 2026-06-05 Phase B spec:
 *   chunkSize=1000, overlap=100 (down from Phase A's 200 per Jan 2026 research),
 *   minSize=200 (prevents tail-chunk noise; tail is allowed below minSize only
 *   when it's the final chunk of the document).
 */
export function chunkByPage(
    pages: PageText[],
    opts: { chunkSize?: number; overlap?: number; minSize?: number } = {}
): Chunk[] {
    const CHUNK_SIZE = opts.chunkSize ?? 1000;
    const OVERLAP = opts.overlap ?? 100;
    const MIN_SIZE = opts.minSize ?? 200;
    const STRIDE = CHUNK_SIZE - OVERLAP;

    if (pages.length === 0) return [];

    // Build fullText + offsetMap. The map records, for each char index in
    // fullText, which page number it came from. Sentinel chars between pages
    // are mapped to the page they come BEFORE so a chunk that starts on the
    // sentinel still picks up the right pageStart.
    const offsetMap: number[] = [];
    let fullText = '';

    pages.forEach((page, i) => {
        if (i > 0) {
            fullText += PAGE_SEPARATOR;
            offsetMap.push(page.pageNum);
        }
        for (let j = 0; j < page.text.length; j++) {
            offsetMap.push(page.pageNum);
        }
        fullText += page.text;
    });

    const chunks: Chunk[] = [];
    for (let start = 0; start < fullText.length; start += STRIDE) {
        const end = Math.min(start + CHUNK_SIZE, fullText.length);
        const rawSlice = fullText.slice(start, end);
        // Replace sentinel with space, collapse whitespace, trim.
        const text = rawSlice.replace(/\f/g, ' ').replace(/\s+/g, ' ').trim();

        // Skip too-small chunks unless it's the very last one.
        const isTail = end >= fullText.length;
        if (text.length < MIN_SIZE && !isTail) {
            if (isTail) break;
            continue;
        }
        if (text.length === 0) {
            if (isTail) break;
            continue;
        }

        // pageStart = first char's page; pageEnd = last char's page.
        const pageStart = offsetMap[start] ?? pages[0].pageNum;
        const pageEnd = offsetMap[Math.max(start, end - 1)] ?? pageStart;

        chunks.push({
            text,
            pageStart,
            pageEnd,
            charCount: text.length,
        });

        if (isTail) break;
    }

    return chunks;
}
