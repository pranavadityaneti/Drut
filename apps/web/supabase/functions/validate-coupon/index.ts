// validate-coupon — preview a coupon's effect for the calling user + plan WITHOUT
// committing. Drives the paywall price preview. Returns 200 with { valid:false,
// reason } for bad codes (not an HTTP error) so the client shows the reason inline.
// The real discount is always re-computed at order time — this is display-only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { validateAndPriceCoupon } from '../_shared/coupon.ts';
import { amountPaiseFor, isFirstTimerSubscriber } from '../_shared/pricing.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
    plan: 'monthly' | 'annual';
    coupon_code: string;
}

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'missing-bearer' });

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: 'invalid-bearer' });
    const user = userData.user;

    let body: Body;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: 'invalid-json' });
    }
    const plan = body?.plan;
    if (plan !== 'monthly' && plan !== 'annual') {
        return json(400, { error: 'invalid-plan' });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const isFirstTimer = await isFirstTimerSubscriber(svc, user.id);
    const basePaise = amountPaiseFor(plan, isFirstTimer);

    const res = await validateAndPriceCoupon(svc, body.coupon_code, plan, user.id, basePaise);
    if (!res.ok) {
        return json(200, { valid: false, reason: res.reason });
    }

    return json(200, {
        valid: true,
        code: res.coupon!.code,
        originalPaise: basePaise,
        discountPaise: res.discountPaise,
        finalPaise: res.finalPaise,
        isFree: res.finalPaise < 100,   // sub-₹1 → granted free (Razorpay minimum)
    });
});
