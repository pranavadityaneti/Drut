/**
 * Admin access — the SINGLE client-side source of truth for "is this user an admin".
 *
 * Consumed by the web app (Sidebar nav gate, MobileNav, the /admin route guard).
 * Replaces the per-file hardcoded email checks that had drifted (MobileNav was
 * missing an admin email).
 *
 * NOTE: Supabase Edge Functions run on Deno and cannot import this workspace
 * package, so they keep their OWN copy at
 * apps/web/supabase/functions/_shared/admin-allowlist.ts. When you add / remove /
 * rotate an admin email, update BOTH this file and that one. (Post-beta, both
 * should be replaced by a DB-level admin_users table — forlater #48.)
 *
 * All comparisons are lowercase-normalized to avoid case-sensitivity bugs.
 */

export const ADMIN_EMAILS: ReadonlySet<string> = new Set([
    'pranav.n@ideaye.in',
    'pranav.n@drut.club',
]);

/** True iff the email belongs to an admin. Null/undefined → false (deny by default). */
export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.has(email.toLowerCase());
}
