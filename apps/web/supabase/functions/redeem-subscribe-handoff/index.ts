// redeem-subscribe-handoff — PUBLIC endpoint (the handoff token IS the credential).
// The WEB /subscribe page POSTs the opaque token here. We ATOMICALLY validate +
// consume it (single-use, unexpired), resolve the user, and mint a one-time
// Supabase login hash via admin.generateLink. The web then calls
// supabase.auth.verifyOtp({ token_hash, type }) to establish the session for that
// exact user. The login hash is returned over HTTPS — it never touches a URL.
//
// ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set).
//
// Deploy with --no-verify-jwt (no user session exists yet — the token gates access).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST')    return json(405, { error: 'method-not-allowed' });

    let body: { token?: string };
    try { body = await req.json(); } catch { return json(400, { error: 'invalid-json' }); }
    const token = (body?.token || '').trim();
    if (!token) return json(400, { error: 'missing-token' });

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Atomically CONSUME the token: the UPDATE only matches an unused, unexpired row,
    // and PostgreSQL row-locking makes this single-use even under concurrent redeems.
    const { data: consumed, error: consumeErr } = await supabaseService
        .from('web_handoff_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .select('user_id')
        .maybeSingle();

    if (consumeErr) {
        console.error('[redeem-subscribe-handoff] consume failed', consumeErr);
        return json(500, { error: 'redeem-failed' });
    }
    if (!consumed) return json(401, { error: 'invalid-or-expired-token' });

    // Resolve the user's email.
    const { data: target, error: targetErr } = await supabaseService.auth.admin.getUserById(consumed.user_id);
    if (targetErr || !target?.user?.email) return json(404, { error: 'user-not-found' });
    const email = target.user.email;

    // Mint a one-time login hash for this user. generateLink does NOT send an email —
    // it just returns the hashed_token the browser will verify to get a session.
    const { data: link, error: linkErr } = await supabaseService.auth.admin.generateLink({
        type: 'magiclink',
        email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
        console.error('[redeem-subscribe-handoff] generateLink failed', linkErr);
        return json(500, { error: 'login-mint-failed' });
    }

    return json(200, {
        email,
        token_hash: link.properties.hashed_token,
        verification_type: link.properties.verification_type, // typically 'magiclink'
    });
});
