// SHA-256 question-text hash for the admin Bulk Import dedup path.
//
// Hash MUST match migration 040's backfill formula byte-for-byte:
//
//   encode(digest(LOWER(REGEXP_REPLACE(text, '\s+', ' ', 'g')), 'sha256'), 'hex')
//
// CRITICAL CORRECTNESS NOTE:
// Postgres `\s` in REGEXP_REPLACE matches POSIX whitespace ONLY
// (space, tab, \n, \r, \f, \v). It does NOT match Unicode whitespace
// like NBSP (U+00A0), thin space (U+2009), or U+200B by default —
// but JS `\s` DOES match those.
//
// Claude.ai output regularly contains NBSPs in math expressions
// (e.g. "sin(π/2)" sometimes has NBSP between operator and operand).
// If we used JS `\s` here, we'd normalize NBSP → ' ', but Postgres
// would not — causing silent dedup failure: the same logical question
// could produce two different hashes depending on origin (admin import
// vs DB backfill).
//
// Therefore: use the POSIX character class EXPLICITLY:
//   /[\t\n\v\f\r ]+/g
// instead of:
//   /\s+/g
//
// We also normalize Unicode to NFC before hashing, so visually-identical
// strings with different code-point sequences (NFC vs NFD — e.g.,
// "é" as U+00E9 vs U+0065 U+0301) produce the same hash regardless of
// source. NOTE: migration 040's SQL backfill does NOT do NFC normalization
// — if NFD strings ever appear in cached_questions today, this JS path
// will produce a different hash than the DB-backfilled value. Current
// content is ASCII-Latin so NFC is a no-op for production rows; flag if
// multilingual or Greek-heavy content is ingested later.
//
// Verification recipe (run before any production use):
//   SELECT encode(digest(LOWER(REGEXP_REPLACE(
//     'sin(π/2)', '\s+', ' ', 'g'
//   )), 'sha256'), 'hex');
//   -- compare against await questionTextHash('sin(π/2)')
// Repeat with: leading whitespace, NBSP, thin space, tabs, em-dash,
// Greek letters. The two engines must produce IDENTICAL hex strings.

export async function questionTextHash(questionText: string): Promise<string> {
  const normalized = questionText
    .normalize('NFC')                    // Unicode composed form
    .toLowerCase()                       // case folding (ASCII-safe)
    .replace(/[\t\n\v\f\r ]+/g, ' ');    // POSIX whitespace ONLY — matches PG `\s`
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
