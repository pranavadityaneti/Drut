// create-razorpay-order — Bearer-JWT-verified endpoint that creates a
// Razorpay order for the calling user, then returns the order_id +
// amount that the client-side Razorpay Checkout consumes to render the
// checkout sheet.
//
// FLOW:
//   1. Verify the bearer JWT → resolve user_id + email.
//   2. Body { plan: 'monthly' | 'annual' }.
//   3. Re-derive the amount SERVER-SIDE from SERVER_PRICING + first-timer status.
//      The client NEVER sends an amount — it is computed here, authoritatively.
//   4. POST to Razorpay https://api.razorpay.com/v1/orders with Basic auth.
//   5. Insert a pending row into `subscriptions` so verify-razorpay-payment
//      can flip it to 'active' after the signature check.
//   6. Return { order_id, amount_paise, currency, plan, key_id, receipt }.
//
// FIRST-TIMER PRICING: the ₹1,799 intro applies to the annual plan only, and
//   only on a user's FIRST paid subscription. We treat a user as a first-timer
//   when they have NO prior subscription row past the 'pending' stage (abandoned
//   checkouts leave only pending rows and must NOT burn the intro).
//
// ENV REQUIRED:
//   RAZORPAY_KEY_ID         — public-ish, from Razorpay dashboard
//   RAZORPAY_KEY_SECRET     — SECRET, from Razorpay dashboard (server-only)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-set)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const RAZORPAY_KEY_ID       = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET   = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const RAZORPAY_API_BASE     = 'https://api.razorpay.com/v1';

// ---------------------------------------------------------------------------
// Pricing — server-side MIRROR of @drut/shared/lib/pricing.ts.
// KEEP IN SYNC. Decided 2026-06-26: monthly ₹199, annual ₹1999 (₹1799 first-timer
// intro). The client display reads pricing.ts; the charge is computed HERE so a
// tampered client can never change the amount.
// ---------------------------------------------------------------------------
const SERVER_PRICING: Record<'monthly' | 'annual', {
    amount_paise: number;
    first_timer_amount_paise?: number;
    days: number;
    label: string;
}> = {
    monthly: { amount_paise: 19900,                                days: 30,  label: 'Drut Pro · Monthly' },
    annual:  { amount_paise: 199900, first_timer_amount_paise: 179900, days: 365, label: 'Drut Pro · Annual'  },
};

/** Effective amount in paise for a plan, given first-timer status (mirrors priceForPlan). */
function amountPaiseFor(plan: 'monthly' | 'annual', isFirstTimer: boolean): number {
    const spec = SERVER_PRICING[plan];
    if (plan === 'annual' && isFirstTimer && spec.first_timer_amount_paise) {
        return spec.first_timer_amount_paise;
    }
    return spec.amount_paise;
}

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

    const planSpec = SERVER_PRICING[plan];

    // --- 3. KEY CHECK — fail FAST + LOUD if Razorpay env not wired ---
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        // Don't 500 silently — return a clear message so the client paywall
        // can render "Payment temporarily unavailable" instead of looking broken.
        return json(503, {
            error: 'razorpay-not-configured',
            detail: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase function env.',
        });
    }

    // --- 4. First-timer detection (service role; bypasses RLS) ---
    // First-timer = no subscription row that ever progressed past 'pending'.
    // Abandoned checkouts (pending-only) keep the intro available.
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { count: priorCount, error: priorErr } = await supabaseService
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'pending');

    if (priorErr) {
        // Fail SAFE on the charge: if we can't confirm first-timer status, charge
        // the standard (non-discounted) price rather than risk repeated intros.
        console.error('[create-razorpay-order] first-timer lookup failed', priorErr);
    }
    const isFirstTimer = !priorErr && (priorCount ?? 0) === 0;

    const amountPaise = amountPaiseFor(plan, isFirstTimer);

    // Razorpay enforces amount >= 100 paise — our prices are well above.
    if (amountPaise < 100) {
        return json(400, { error: 'amount-below-minimum' });
    }

    // --- 5. App-side receipt for idempotency / reconciliation (max 40 chars) ---
    const receipt = `drut_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;

    // --- 6. POST to Razorpay /orders ---
    const razorpayReq = {
        amount:   amountPaise,    // Razorpay takes paise directly
        currency: 'INR',
        receipt,
        notes: {
            user_id: user.id,
            user_email: user.email || '',
            plan,
            first_timer: String(isFirstTimer),
            source: 'drut',
        },
    };

    const basicAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const rpResp = await fetch(`${RAZORPAY_API_BASE}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(razorpayReq),
    });

    if (!rpResp.ok) {
        const errBody = await rpResp.text();
        console.error('[create-razorpay-order] Razorpay API failed', rpResp.status, errBody);
        return json(rpResp.status === 401 ? 401 : 502, {
            error: rpResp.status === 401 ? 'razorpay-auth-failed' : 'razorpay-api-failed',
            status: rpResp.status,
            detail: errBody.slice(0, 500),
        });
    }

    const rpBody = await rpResp.json();
    const orderId = rpBody.id as string | undefined;
    if (!orderId) {
        return json(502, { error: 'no-order-id', razorpay: rpBody });
    }

    // --- 7. Insert pending subscription row (service role bypasses RLS) ---
    // verify-razorpay-payment flips status='active' + sets expires_at.
    const expiresAt = new Date(Date.now() + planSpec.days * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseService.from('subscriptions').insert({
        user_id: user.id,
        plan,
        status: 'pending',
        razorpay_order_id: orderId,
        amount_paise: amountPaise,
        currency: 'INR',
        expires_at: expiresAt,
    });

    if (insertErr) {
        console.error('[create-razorpay-order] subscriptions insert failed', insertErr);
        // Don't block — verify endpoint can still find the order by id via Razorpay
        // and reconstruct. Logging is enough.
    }

    return json(200, {
        order_id: orderId,
        amount_paise: amountPaise,
        currency: 'INR',
        plan,
        key_id: RAZORPAY_KEY_ID,   // public id — client SDK needs this to open the modal
        receipt,
    });
});
