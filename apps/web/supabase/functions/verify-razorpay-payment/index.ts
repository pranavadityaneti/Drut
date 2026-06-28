// verify-razorpay-payment — synchronous signature verification after the
// user completes checkout in the Razorpay sheet.
//
// FLOW (client-side, then this function):
//   1. Client: createRazorpayOrder() → gets order_id
//   2. Client: opens Razorpay checkout with order_id
//   3. User pays → checkout returns
//        { razorpay_payment_id, razorpay_order_id, razorpay_signature }
//   4. Client: POSTs those 3 fields here for verification.
//   5. Server: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET).
//      If hex digest === razorpay_signature → flip subscription 'active'.
//      If mismatch → 400, leave subscription pending, log to payment_events.
//
// WHY synchronous verify (not webhook):
//   - Razorpay's checkout handshake includes the signature so we can confirm
//     payment immediately and unlock Pro without waiting for a webhook. A
//     webhook is the future SAFETY NET for async events (refunds, disputes).
//   - This endpoint is the source of truth for "did the user just pay".
//
// AUTH: Bearer JWT verified — only the user who created the order can verify it
//       (defense against replaying someone else's signature).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const RAZORPAY_KEY_SECRET   = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

interface Body {
    razorpay_payment_id:   string;
    razorpay_order_id:     string;
    razorpay_signature:    string;
}

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

// Constant-time hex-string compare.
function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST')    return json(405, { error: 'method-not-allowed' });

    // --- 1. JWT verification ---
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'missing-bearer' });

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: 'invalid-bearer' });

    const user = userData.user;

    // --- 2. Body validation ---
    let body: Body;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: 'invalid-json' });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body || {} as any;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return json(400, { error: 'missing-fields', detail: 'razorpay_payment_id, razorpay_order_id, razorpay_signature are required' });
    }

    if (!RAZORPAY_KEY_SECRET) {
        return json(503, { error: 'razorpay-not-configured', detail: 'RAZORPAY_KEY_SECRET not set' });
    }

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // --- 3. Compute and compare signature ---
    const expectedSig = await hmacSha256Hex(
        RAZORPAY_KEY_SECRET,
        `${razorpay_order_id}|${razorpay_payment_id}`,
    );

    const sigValid = timingSafeEqualHex(expectedSig, razorpay_signature);

    // --- 4. Audit row (always insert, even on bad sig) ---
    await supabaseService.from('payment_events').insert({
        user_id:             user.id,
        razorpay_event_type: sigValid ? 'payment.verified' : 'payment.signature_mismatch',
        razorpay_order_id,
        razorpay_payment_id,
        signature_verified:  sigValid,
        raw_payload:         { source: 'verify-razorpay-payment', body },
        processed:           sigValid,
    });

    if (!sigValid) {
        // Per the spec: do NOT mark as paid. Log + 400.
        console.error('[verify-razorpay-payment] signature mismatch', {
            user: user.id, order: razorpay_order_id, payment: razorpay_payment_id,
        });
        return json(400, { error: 'signature-mismatch' });
    }

    // --- 5. Find the pending subscription row for this order_id ---
    // Belongs to THIS user (defense-in-depth — even if an attacker had a valid
    // signature from a different user's order, they'd have a different user_id
    // on the row and we'd refuse to flip it).
    const { data: sub, error: subErr } = await supabaseService
        .from('subscriptions')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', user.id)
        .single();

    if (subErr || !sub) {
        console.error('[verify-razorpay-payment] subscription not found', subErr);
        return json(404, { error: 'subscription-not-found' });
    }

    // --- 6. Expire any OTHER active subscription for this user FIRST ---
    // The subscriptions_one_active_per_user unique index allows only one active row
    // per user. On a renewal/upgrade the previous active row must be retired before
    // we flip the new one to 'active', or the UPDATE below violates the constraint.
    // (First-time buyers have no prior active row — this is a no-op for them.)
    const { error: expireErr } = await supabaseService
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('id', sub.id);
    if (expireErr) {
        console.error('[verify-razorpay-payment] failed to expire prior active sub', expireErr);
        return json(500, { error: 'prior-sub-expire-failed', detail: expireErr.message });
    }

    // --- 7. Idempotent flip: set active + period ---
    // If a duplicate verify hits this (e.g. user double-clicks), the second
    // call just re-affirms the same active row.
    const planDays = sub.plan === 'annual' ? 365 : 30;
    const expiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabaseService
        .from('subscriptions')
        .update({
            status:              'active',
            razorpay_payment_id,
            razorpay_signature,
            started_at:          new Date().toISOString(),
            expires_at:          expiresAt,
        })
        .eq('id', sub.id);

    if (updateErr) {
        console.error('[verify-razorpay-payment] failed to activate sub', updateErr);
        return json(500, { error: 'sub-update-failed', detail: updateErr.message });
    }

    return json(200, {
        verified: true,
        plan:     sub.plan,
        status:   'active',
        expires_at: expiresAt,
    });
});
