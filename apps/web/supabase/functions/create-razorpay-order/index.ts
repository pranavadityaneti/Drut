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
import { validateAndPriceCoupon, recordRedemption } from '../_shared/coupon.ts';
import { SERVER_PRICING, amountPaiseFor, isFirstTimerSubscriber } from '../_shared/pricing.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const RAZORPAY_KEY_ID       = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET   = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const RAZORPAY_API_BASE     = 'https://api.razorpay.com/v1';

interface Body {
    plan: 'monthly' | 'annual';
    coupon_code?: string;
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

    // --- 4. First-timer detection (service role; bypasses RLS) ---
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const isFirstTimer = await isFirstTimerSubscriber(supabaseService, user.id);
    const baseAmountPaise = amountPaiseFor(plan, isFirstTimer);

    // --- 4b. Apply coupon (server-side; client never sends an amount/discount) ---
    let chargePaise = baseAmountPaise;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    if (body?.coupon_code) {
        const couponRes = await validateAndPriceCoupon(supabaseService, body.coupon_code, plan, user.id, baseAmountPaise);
        if (!couponRes.ok) {
            return json(400, { error: 'coupon-invalid', detail: couponRes.reason });
        }
        chargePaise = couponRes.finalPaise;
        couponId = couponRes.coupon!.id;
        couponCode = couponRes.coupon!.code;
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + planSpec.days * 24 * 60 * 60 * 1000).toISOString();

    // --- 5. FREE path: a coupon (or any sub-₹1 result) grants directly, no Razorpay ---
    // Razorpay rejects orders below ₹1 (100 paise), so anything under that is granted.
    if (chargePaise < 100) {
        // Expire any existing active subscription first (one-active-per-user index).
        const { error: expireErr } = await supabaseService
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('user_id', user.id)
            .eq('status', 'active');
        if (expireErr) return json(500, { error: 'expire-prior-failed', detail: expireErr.message });

        const orderTag = couponCode
            ? `coupon-${couponCode}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
            : `comp-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

        const { data: granted, error: grantErr } = await supabaseService
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan,
                status: 'active',
                amount_paise: 0,
                currency: 'INR',
                razorpay_order_id: orderTag,
                started_at: nowIso,
                expires_at: expiresAt,
                coupon_id: couponId,
            })
            .select()
            .single();
        if (grantErr) return json(500, { error: 'grant-failed', detail: grantErr.message });

        if (couponId) await recordRedemption(supabaseService, couponId, user.id, granted?.id ?? null);

        await supabaseService.from('payment_events').insert({
            user_id: user.id,
            razorpay_event_type: 'coupon.free_grant',
            signature_verified: true,
            raw_payload: { plan, coupon: couponCode },
            processed: true,
        });

        return json(200, { free: true, plan, status: 'active', expires_at: expiresAt });
    }

    // --- 6. PAID path: Razorpay order for the (possibly discounted) amount ---
    // Razorpay keys are only needed here (the free path above never calls Razorpay).
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return json(503, {
            error: 'razorpay-not-configured',
            detail: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase function env.',
        });
    }

    const receipt = `drut_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;

    const razorpayReq = {
        amount:   chargePaise,    // Razorpay takes paise directly
        currency: 'INR',
        receipt,
        notes: {
            user_id: user.id,
            user_email: user.email || '',
            plan,
            first_timer: String(isFirstTimer),
            coupon: couponCode || '',
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
    // verify-razorpay-payment flips status='active', sets expires_at, and (if a
    // coupon was used) records the redemption — only AFTER successful payment.
    const { error: insertErr } = await supabaseService.from('subscriptions').insert({
        user_id: user.id,
        plan,
        status: 'pending',
        razorpay_order_id: orderId,
        amount_paise: chargePaise,
        currency: 'INR',
        expires_at: expiresAt,
        coupon_id: couponId,
    });

    if (insertErr) {
        console.error('[create-razorpay-order] subscriptions insert failed', insertErr);
        // Don't block — verify endpoint can still find the order by id via Razorpay.
    }

    return json(200, {
        order_id: orderId,
        amount_paise: chargePaise,
        currency: 'INR',
        plan,
        key_id: RAZORPAY_KEY_ID,   // public id — client SDK needs this to open the modal
        receipt,
        coupon_code: couponCode || undefined,
    });
});
