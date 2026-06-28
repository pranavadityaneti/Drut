// admin-coupons — ADMIN-ONLY coupon management. Action-based:
//   { action: 'list' }                        → { coupons: [...] }
//   { action: 'create', code, type, value, ... } → { coupon }
//   { action: 'set_active', id, active }       → { ok: true }
//
// Codes are normalized to UPPERCASE. For type='flat', `value` arrives in RUPEES
// and is stored as paise. Admin-gated via require-admin (service-role only).

import { corsHeaders } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/require-admin.ts';

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

interface Body {
    action: 'list' | 'create' | 'set_active';
    // create
    code?: string;
    type?: 'percent' | 'flat';
    value?: number;
    applies_to_plan?: 'any' | 'monthly' | 'annual';
    max_redemptions?: number | null;
    per_user_limit?: number;
    expires_at?: string | null;
    note?: string;
    // set_active
    id?: string;
    active?: boolean;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

    const gate = await requireAdmin(req);
    if (gate instanceof Response) return gate;
    const { supabaseService } = gate;

    let body: Body;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: 'invalid-json' });
    }

    if (body.action === 'list') {
        const { data, error } = await supabaseService
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return json(500, { error: 'list-failed', detail: error.message });
        return json(200, { coupons: data ?? [] });
    }

    if (body.action === 'set_active') {
        if (!body.id || typeof body.active !== 'boolean') return json(400, { error: 'missing-id-or-active' });
        const { error } = await supabaseService
            .from('coupons')
            .update({ active: body.active })
            .eq('id', body.id);
        if (error) return json(500, { error: 'update-failed', detail: error.message });
        return json(200, { ok: true });
    }

    if (body.action === 'create') {
        const code = (body.code || '').trim().toUpperCase();
        const type = body.type;
        if (!code) return json(400, { error: 'missing-code' });
        if (type !== 'percent' && type !== 'flat') return json(400, { error: 'invalid-type' });
        if (typeof body.value !== 'number' || body.value < 0) return json(400, { error: 'invalid-value' });
        if (type === 'percent' && body.value > 100) return json(400, { error: 'percent-over-100' });

        // flat value arrives in rupees → store paise.
        const value = type === 'flat' ? Math.round(body.value * 100) : Math.round(body.value);

        const { data, error } = await supabaseService
            .from('coupons')
            .insert({
                code,
                type,
                value,
                applies_to_plan: body.applies_to_plan ?? 'any',
                max_redemptions: body.max_redemptions ?? null,
                per_user_limit: body.per_user_limit ?? 1,
                expires_at: body.expires_at ?? null,
                note: body.note ?? null,
            })
            .select()
            .single();

        if (error) {
            // Unique-violation on code → friendly message.
            if ((error as any).code === '23505') return json(409, { error: 'code-exists', detail: 'A coupon with that code already exists.' });
            return json(500, { error: 'create-failed', detail: error.message });
        }
        return json(200, { coupon: data });
    }

    return json(400, { error: 'unknown-action' });
});
