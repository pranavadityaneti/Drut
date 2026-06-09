// Admin email allowlist for edge functions.
//
// Edge functions cannot import from the @drut/shared workspace package
// (Deno runtime resolution), so this list is duplicated. Keep in sync with:
//   - apps/web/components/Sidebar.tsx:45 (web admin gate)
//   - apps/web/components/MobileNav.tsx (forlater #43 — currently missing
//     `pranav.n@drut.club`; drift bug)
//   - apps/web/supabase/migrations/029_admin_only_storage_textbooks.sql
//     (RLS policy on textbook storage)
//
// When adding/removing/rotating an admin email, update ALL the above
// sites. The 2026-06-08 architecture note suggests moving to a DB-level
// admin_users table post-beta to make rotation a SQL UPDATE instead of
// a redeploy. Tracked in forlater (#48 — added by PR #4b).
//
// All comparisons are lowercase-normalized to avoid case-sensitivity bugs.

export const ADMIN_EMAILS: ReadonlySet<string> = new Set([
  'pranav.n@ideaye.in',
  'pranav.n@drut.club',
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
