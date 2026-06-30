// create-subscribe-handoff — Bearer-JWT-verified. Mints a one-time, short-lived
// (~2 min) handoff token for the CALLING user and returns a drut.club/subscribe
// URL carrying it. The WEB /subscribe page redeems that token to log this exact
// user in WITHOUT a re-login (see redeem-subscribe-handoff).
//
// The opaque token is the ONLY thing in the URL — it is single-use, and the
// actual login credential is minted later, server-side, at redeem time.
//
// ENV: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-set);
//      WEB_APP_URL (optional, defaults to https://drut.club).
//
// Deploy with --no-verify-jwt (the function verifies the Bearer JWT itself).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEB_APP_URL           = (Deno.env.get('WEB_APP_URL') || 'https://drut.club').replace(/\/+$/, '');

const TOKEN_TTL_SECONDS = 120; // 2 minutes

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

// 32 bytes of CSPRNG randomness, base64url-encoded (no padding) → ~43 chars, unguessable.
function randomToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST')    return json(405, { error: 'method-not-allowed' });

    // 1. Verify the caller's JWT → user.
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'missing-bearer' });

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: 'invalid-bearer' });
    const user = userData.user;

    // 2. Mint a one-time token (service role bypasses the deny-all RLS on the table).
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const token = randomToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

    const { error: insErr } = await supabaseService
        .from('web_handoff_tokens')
        .insert({ token, user_id: user.id, expires_at: expiresAt });
    if (insErr) {
        console.error('[create-subscribe-handoff] insert failed', insErr);
        return json(500, { error: 'handoff-create-failed' });
    }

    return json(200, { url: `${WEB_APP_URL}/subscribe?h=${token}`, expires_at: expiresAt });
});
