// admin-list-payments — ADMIN-ONLY. Returns the subscriptions ledger + recent
// payment_events, enriched with each user's email, plus a small revenue summary.
//
// Auth: requireAdmin (JWT → user → email allowlist). The service-role client is
// only created after that check passes (inside requireAdmin), so this can read
// every user's subscription + the service-role-only payment_events audit log
// that the browser anon client can never see.
//
// Scale note: beta-sized. listUsers pulls one page (up to 1000) to build the
// id→email map, and we cap subscriptions/events. Add pagination before scaling.

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
    // supabase.functions.invoke uses POST; allow GET too for manual checks.
    if (req.method !== 'POST' && req.method !== 'GET') return json(405, { error: 'method-not-allowed' });

    const gate = await requireAdmin(req);
    if (gate instanceof Response) return gate;
    const { supabaseService } = gate;

    // Subscriptions ledger (most recent first).
    const { data: subs, error: subsErr } = await supabaseService
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
    if (subsErr) return json(500, { error: 'subs-query-failed', detail: subsErr.message });

    // Recent Razorpay events (audit trail) — non-fatal if it fails.
    const { data: events } = await supabaseService
        .from('payment_events')
        .select('id, user_id, razorpay_event_type, razorpay_order_id, razorpay_payment_id, signature_verified, processed, received_at')
        .order('received_at', { ascending: false })
        .limit(100);

    // Build user_id → email map (best-effort; email enrichment is non-fatal).
    const emailById = new Map<string, string>();
    try {
        const { data: usersPage } = await supabaseService.auth.admin.listUsers({ page: 1, perPage: 1000 });
        for (const u of usersPage?.users ?? []) emailById.set(u.id, u.email ?? '');
    } catch (e) {
        console.error('[admin-list-payments] listUsers failed (email enrichment skipped)', e);
    }

    const withEmail = (rows: any[] | null) =>
        (rows ?? []).map((r) => ({ ...r, user_email: emailById.get(r.user_id) ?? null }));

    const subsOut = withEmail(subs);
    const eventsOut = withEmail(events);

    const now = Date.now();
    const activeCount = subsOut.filter(
        (s) => s.status === 'active' && new Date(s.expires_at).getTime() > now,
    ).length;
    // Real money collected = sum of non-pending subscription amounts (comps are ₹0).
    const collectedPaise = subsOut
        .filter((s) => s.status !== 'pending')
        .reduce((acc, s) => acc + (s.amount_paise || 0), 0);

    return json(200, {
        subscriptions: subsOut,
        events: eventsOut,
        summary: { activeCount, collectedPaise, total: subsOut.length },
    });
});
