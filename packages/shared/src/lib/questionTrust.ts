// Single source of truth for which cached questions are "trusted" (curated /
// verified upstream) and may bypass client-side keyword validation.
//
// Imported by BOTH web (NewPractice) and mobile (usePracticeQuestions) so the
// three clients — web, Android, iOS — never drift. See CLAUDE.md.

export const TRUSTED_STATUS_SUBSTRINGS = [
  'v3-verified-pyq',      // real previous-year exam questions (highest trust)
  'v3-verified-textbook', // textbook-grounded curation
  'v3-verified-rag',      // RAG-grounded generation
  'admin-verified',       // admin Bulk Import — what admin-bulk-import actually writes
  'manual-curated',       // documented canonical name for curated batches (forward-compat)
  'manual',               // older human-uploaded CSV (substring also matches 'manual-curated')
  '2.6',                  // legacy curated AI batch
  'SubjectFallback',      // curated subject-level fallback
];

export const TRUSTED_SOURCE_TYPES = ['pyq', 'textbook', 'rag-verified'];

/**
 * True when a question carries a verification_status or source_type that means
 * it was curated/verified upstream and can skip client-side keyword validation.
 */
export function isTrustedQuestion(q: any): boolean {
  const status = String(q?.verification_status || '');
  const sourceType = String(q?.source_type || '');
  if (TRUSTED_STATUS_SUBSTRINGS.some((s) => status.includes(s))) return true;
  if (TRUSTED_SOURCE_TYPES.includes(sourceType)) return true;
  return false;
}
