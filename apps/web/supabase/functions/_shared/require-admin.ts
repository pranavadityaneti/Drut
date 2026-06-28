// require-admin — shared authorization guard for admin-only edge functions.
//
// Verifies the caller's bearer JWT, resolves the user, and checks the email
// against the admin allowlist (isAdminEmail). On success returns the resolved
// user PLUS a service-role Supabase client (so the admin function can read/write
// across all users). On any failure returns a ready-to-send error Response.
//
// Usage in an admin function:
//   const gate = await requireAdmin(req);
//   if (gate instanceof Response) return gate;   // 401/403 — short-circuit
//   const { user, supabaseService } = gate;
//
// SECURITY: deny by default. The service-role client is ONLY ever created after
// the admin check passes — it must never be returned to a non-admin caller.

import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
import { isAdminEmail } from './admin-allowlist.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export interface AdminContext {
    user: User;
    /** Service-role client — full DB access. Created ONLY after the admin check passes. */
    supabaseService: SupabaseClient;
}

function denied(status: number, error: string) {
    return new Response(JSON.stringify({ error }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/**
 * Gate an admin-only edge function. Returns AdminContext on success, or an error
 * Response (401 missing/invalid bearer, 403 not-admin) the caller should return.
 */
export async function requireAdmin(req: Request): Promise<AdminContext | Response> {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return denied(401, 'missing-bearer');

    // Verify the JWT with the anon client scoped to the caller's token.
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser();
    if (userErr || !userData.user) return denied(401, 'invalid-bearer');

    if (!isAdminEmail(userData.user.email)) return denied(403, 'forbidden');

    // Admin confirmed — now (and only now) mint the service-role client.
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    return { user: userData.user, supabaseService };
}
