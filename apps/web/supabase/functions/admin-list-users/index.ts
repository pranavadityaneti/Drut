// admin-list-users — ADMIN-ONLY. Lists beta users (from auth.users via the
// service-role admin API) enriched with their Pro status and today's question
// usage. The browser anon client cannot enumerate users at all — only this
// admin-gated server path can.

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
    if (req.method !== 'POST' && req.method !== 'GET') return json(405, { error: 'method-not-allowed' });

    const gate = await requireAdmin(req);
    if (gate instanceof Response) return gate;
    const { supabaseService } = gate;

    // Users (beta scale: one page of up to 1000). Add pagination before scaling.
    let users: any[] = [];
    try {
        const { data: usersPage, error: usersErr } = await supabaseService.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (usersErr) return json(500, { error: 'list-users-failed', detail: usersErr.message });
        users = usersPage?.users ?? [];
    } catch (e: any) {
        return json(500, { error: 'list-users-failed', detail: String(e?.message || e) });
    }

    // Pro status: latest-by-created subscription per user; pro = active & not expired.
    const proByUser = new Map<string, { isPro: boolean; plan: string | null; expires_at: string | null }>();
    const { data: subs } = await supabaseService
        .from('subscriptions')
        .select('user_id, plan, status, expires_at, created_at')
        .order('created_at', { ascending: false });
    const now = Date.now();
    for (const s of subs ?? []) {
        if (proByUser.has(s.user_id)) continue; // first = most recent (ordered desc)
        const isPro = s.status === 'active' && new Date(s.expires_at).getTime() > now;
        proByUser.set(s.user_id, { isPro, plan: isPro ? s.plan : null, expires_at: isPro ? s.expires_at : null });
    }

    // Today's usage.
    const usageByUser = new Map<string, number>();
    const { data: usageRows } = await supabaseService
        .from('daily_question_usage')
        .select('user_id, count, usage_date')
        .eq('usage_date', new Date().toISOString().slice(0, 10));
    for (const u of usageRows ?? []) usageByUser.set(u.user_id, u.count);

    const out = users.map((u) => {
        const md = u.user_metadata || {};
        const pro = proByUser.get(u.id) || { isPro: false, plan: null, expires_at: null };
        return {
            id: u.id,
            email: u.email ?? null,
            full_name: md.full_name || md.name || null,
            exam_profile: md.exam_profile || null,
            target_exams: md.target_exams || null,
            class_level: md.class || null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
            isPro: pro.isPro,
            plan: pro.plan,
            expires_at: pro.expires_at,
            usageToday: usageByUser.get(u.id) ?? 0,
        };
    });

    // Most recent signups first.
    out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return json(200, { users: out, total: out.length });
});
