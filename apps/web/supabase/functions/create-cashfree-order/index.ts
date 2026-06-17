// create-cashfree-order — server-side endpoint that creates a Cashfree
// order for the calling authenticated user, then returns the
// payment_session_id that the client-side Cashfree SDK consumes to
// render the checkout sheet.
//
// FLOW:
//   1. Verify the bearer JWT → resolve user_id + email.
//   2. Body { plan: 'monthly' | 'annual' } → resolve amount in paise.
//   3. POST to Cashfree https://api.cashfree.com/pg/orders with our
//      app-side order_id (uuid) so we own the idempotency key.
//   4. Return { order_id, payment_session_id, amount, currency }
//      to the client. The client SDK (Web Checkout / RN SDK) takes
//      payment_session_id and renders the rest.
//   5. Insert a pending row into `subscriptions` so the webhook can
//      flip it to 'active' on PAYMENT_SUCCESS.
//
// ENV REQUIRED:
//   CASHFREE_APP_ID         — public-ish, from Cashfree dashboard
//   CASHFREE_SECRET_KEY     — secret, from Cashfree dashboard
//   CASHFREE_API_BASE       — 'https://api.cashfree.com' (prod) or
//                             'https://sandbox.cashfree.com' (test)
//   CASHFREE_RETURN_URL     — where to send the user after checkout
//                             (e.g. https://www.drut.club/profile/subscription)
//
// AUTH:
//   - Bearer token in Authorization header, verified server-side via
//     supabaseAnon.auth.getUser() (same pattern as admin-bulk-import).
//   - No admin allowlist — any authenticated user can buy.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CASHFREE_APP_ID       = Deno.env.get('CASHFREE_APP_ID') || '';
const CASHFREE_SECRET_KEY   = Deno.env.get('CASHFREE_SECRET_KEY') || '';
const CASHFREE_API_BASE     = Deno.env.get('CASHFREE_API_BASE') || 'https://sandbox.cashfree.com';
const CASHFREE_RETURN_URL   = Deno.env.get('CASHFREE_RETURN_URL') || 'https://www.drut.club/profile/subscription';

// Pricing source of truth. Mirror in @drut/shared/lib/pricing.ts (web + mobile UI).
const PLANS: Record<'monthly' | 'annual', { amount_paise: number; days: number; label: string }> = {
    monthly: { amount_paise: 29900,  days: 30,  label: 'Drut Pro Monthly' },
    annual:  { amount_paise: 149900, days: 365, label: 'Drut Pro Annual'  },
};

interface Body {
    plan: 'monthly' | 'annual';
}

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    const plan = body?.plan;
    if (plan !== 'monthly' && plan !== 'annual') {
        return json(400, { error: 'invalid-plan', detail: 'plan must be monthly or annual' });
    }

    const planSpec = PLANS[plan];

    // --- 3. KEY CHECK — fail FAST + LOUD if Cashfree env not wired ---
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
        // Don't 500 silently — return a clear message so the client paywall
        // can render "Payment temporarily unavailable" instead of looking broken.
        return json(503, {
            error: 'cashfree-not-configured',
            detail: 'Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Supabase function env.',
        });
    }

    // --- 4. Generate our app-side order_id (idempotency key) ---
    const orderId = `drut_${crypto.randomUUID().replace(/-/g, '')}`;

    // --- 5. POST to Cashfree /pg/orders ---
    const cashfreeReq = {
        order_id: orderId,
        order_amount: planSpec.amount_paise / 100,        // Cashfree wants rupees, not paise
        order_currency: 'INR',
        customer_details: {
            customer_id: user.id,
            customer_email: user.email || `${user.id}@no-email.drut.club`,
            customer_phone: (user.phone || user.user_metadata?.phone || '9999999999').replace(/^\+/, ''),
            customer_name: user.user_metadata?.full_name || 'Drut User',
        },
        order_meta: {
            return_url: `${CASHFREE_RETURN_URL}?order_id={order_id}`,
            // notify_url is configured globally in Cashfree dashboard, points to cashfree-webhook
        },
        order_note: planSpec.label,
        order_tags: { plan, source: 'drut' },
    };

    const cfResp = await fetch(`${CASHFREE_API_BASE}/pg/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01',
        },
        body: JSON.stringify(cashfreeReq),
    });

    if (!cfResp.ok) {
        const errBody = await cfResp.text();
        console.error('[create-cashfree-order] Cashfree API failed', cfResp.status, errBody);
        return json(502, { error: 'cashfree-api-failed', status: cfResp.status, detail: errBody.slice(0, 500) });
    }

    const cfBody = await cfResp.json();
    const paymentSessionId = cfBody.payment_session_id;
    if (!paymentSessionId) {
        return json(502, { error: 'no-payment-session-id', cashfree: cfBody });
    }

    // --- 6. Insert pending subscription row (service role bypasses RLS) ---
    // The webhook flips status to 'active' on PAYMENT_SUCCESS.
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const expiresAt = new Date(Date.now() + planSpec.days * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseService.from('subscriptions').insert({
        user_id: user.id,
        plan,
        status: 'pending',
        cashfree_order_id: orderId,
        amount_paise: planSpec.amount_paise,
        currency: 'INR',
        expires_at: expiresAt,
    });

    if (insertErr) {
        console.error('[create-cashfree-order] subscriptions insert failed', insertErr);
        // Don't block the user — the webhook still has the order_id + meta and
        // can backfill. Logging is enough.
    }

    return json(200, {
        order_id: orderId,
        payment_session_id: paymentSessionId,
        amount_paise: planSpec.amount_paise,
        currency: 'INR',
        plan,
    });
});
