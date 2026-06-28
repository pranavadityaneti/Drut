// admin-grant-pro — ADMIN-ONLY. Comp a Pro subscription to a user (no payment).
// Creates a ₹0 active subscription, expiring any prior active row first (the
// one-active-per-user unique index). Audited to payment_events.
//
// Body: { user_id: string, plan: 'monthly' | 'annual', days?: number }
//   days overrides the default period (monthly 30 / annual 365).

import { corsHeaders } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/require-admin.ts';

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

    const gate = await requireAdmin(req);
    if (gate instanceof Response) return gate;
    const { supabaseService, user: admin } = gate;

    let body: { user_id?: string; plan?: string; days?: number };
    try {
        body = await req.json();
    } catch {
        return json(400, { error: 'invalid-json' });
    }

    const userId = body?.user_id;
    const plan = body?.plan;
    if (!userId) return json(400, { error: 'missing-user_id' });
    if (plan !== 'monthly' && plan !== 'annual') {
        return json(400, { error: 'invalid-plan', detail: 'plan must be monthly or annual' });
    }
    const planDays = Number.isFinite(body?.days) && (body!.days as number) > 0
        ? Math.floor(body!.days as number)
        : (plan === 'annual' ? 365 : 30);

    // Confirm the target user exists (clear 404 instead of a FK error).
    const { data: target, error: targetErr } = await supabaseService.auth.admin.getUserById(userId);
    if (targetErr || !target?.user) return json(404, { error: 'user-not-found' });

    // Expire any existing active subscription first (unique-active-per-user index).
    const { error: expireErr } = await supabaseService
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('status', 'active');
    if (expireErr) return json(500, { error: 'expire-prior-failed', detail: expireErr.message });

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();
    const compOrderId = `comp-${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    const { data: inserted, error: insertErr } = await supabaseService
        .from('subscriptions')
        .insert({
            user_id: userId,
            plan,
            status: 'active',
            amount_paise: 0,            // comp — requires the >= 0 constraint (migration 20260627120300)
            currency: 'INR',
            razorpay_order_id: compOrderId,
            started_at: nowIso,
            expires_at: expiresAt,
        })
        .select()
        .single();

    if (insertErr) return json(500, { error: 'grant-failed', detail: insertErr.message });

    // Audit trail.
    await supabaseService.from('payment_events').insert({
        user_id: userId,
        razorpay_event_type: 'admin.comp_granted',
        razorpay_order_id: compOrderId,
        signature_verified: true,
        raw_payload: { granted_by: admin.email, plan, planDays },
        processed: true,
    });

    return json(200, { granted: true, plan, expires_at: expiresAt, subscription: inserted });
});
