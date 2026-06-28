// admin-revoke-pro — ADMIN-ONLY. Cancel a user's active subscription (comp or
// paid). Sets status='canceled' + canceled_at on any active row. Audited.
//
// Body: { user_id: string }

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

    let body: { user_id?: string };
    try {
        body = await req.json();
    } catch {
        return json(400, { error: 'invalid-json' });
    }

    const userId = body?.user_id;
    if (!userId) return json(400, { error: 'missing-user_id' });

    const nowIso = new Date().toISOString();
    const { data: canceled, error: cancelErr } = await supabaseService
        .from('subscriptions')
        .update({ status: 'canceled', canceled_at: nowIso })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select('id');

    if (cancelErr) return json(500, { error: 'revoke-failed', detail: cancelErr.message });

    const count = canceled?.length ?? 0;

    if (count > 0) {
        await supabaseService.from('payment_events').insert({
            user_id: userId,
            razorpay_event_type: 'admin.pro_revoked',
            signature_verified: true,
            raw_payload: { revoked_by: admin.email, canceled_count: count },
            processed: true,
        });
    }

    return json(200, { revoked: true, canceled_count: count });
});
