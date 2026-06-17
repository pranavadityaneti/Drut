// cashfree-webhook — receives Cashfree's server-to-server payment events,
// verifies the HMAC signature, audits the raw payload, and (on success)
// flips the matching `subscriptions` row to 'active'.
//
// Configured in Cashfree dashboard: Settings → Webhooks → add this URL.
// Cashfree retries failed deliveries with exponential backoff, so this
// MUST be idempotent (same order_id replay = same end state).
//
// SIGNATURE (Cashfree docs, v2023-08-01):
//   header `x-webhook-signature`  = base64(HMAC_SHA256(secret, timestamp + payload))
//   header `x-webhook-timestamp`  = unix ms
//   compute HMAC over (timestamp + raw_body_bytes), base64-encode, constant-time compare.
//
// FLOW:
//   1. Read raw body bytes BEFORE JSON-parsing (we need exact bytes for HMAC).
//   2. Verify signature. If invalid, audit + 401.
//   3. Insert payment_events row (audit, before any state change).
//   4. Switch on event type:
//        PAYMENT_SUCCESS_WEBHOOK  → flip pending sub for that order_id → 'active'
//        PAYMENT_FAILED_WEBHOOK   → mark sub as 'expired' (so user can retry)
//        PAYMENT_USER_DROPPED_WEBHOOK → leave 'pending' (user can retry)
//        SUBSCRIPTION_CHARGED     → extend expires_at by plan.days
//        SUBSCRIPTION_CANCELLED   → set status='canceled', canceled_at=now()
//   5. Mark payment_events.processed = true. 200 OK.
//
// IMPORTANT: always 200 OK after audit. If we 500, Cashfree retries
// indefinitely. Use payment_events.error to flag failures for manual review.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CASHFREE_WEBHOOK_SECRET = Deno.env.get('CASHFREE_WEBHOOK_SECRET') || '';

// Plan → renewal-window in days. Mirrors create-cashfree-order.
const PLAN_DAYS: Record<string, number> = { monthly: 30, annual: 365 };

function ok(payload: unknown = { ok: true }) {
    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function bad(status: number, error: string) {
    return new Response(JSON.stringify({ error }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

// Constant-time string compare to avoid timing side-channels on signature check.
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

async function verifySignature(rawBody: string, timestamp: string, signature: string): Promise<boolean> {
    if (!CASHFREE_WEBHOOK_SECRET) return false;
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(CASHFREE_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp + rawBody));
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    return timingSafeEqual(expected, signature);
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST')    return bad(405, 'method-not-allowed');

    const rawBody    = await req.text();
    const signature  = req.headers.get('x-webhook-signature')  || '';
    const timestamp  = req.headers.get('x-webhook-timestamp')  || '';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // --- 1. Verify signature ---
    const sigValid = await verifySignature(rawBody, timestamp, signature);

    // Parse payload (best-effort; even invalid sigs get audited).
    let payload: any = null;
    try { payload = JSON.parse(rawBody); } catch { /* keep null */ }

    const eventType        = payload?.type || payload?.data?.payment?.payment_status || 'UNKNOWN';
    const orderId          = payload?.data?.order?.order_id     || null;
    const cashfreePayId    = payload?.data?.payment?.cf_payment_id?.toString() || null;

    // --- 2. Audit row (always insert, even on bad sig) ---
    const { data: eventRow, error: auditErr } = await supabase
        .from('payment_events')
        .insert({
            cashfree_event_type: eventType,
            cashfree_order_id:   orderId,
            cashfree_payment_id: cashfreePayId,
            signature_verified:  sigValid,
            raw_payload:         payload ?? { raw: rawBody.slice(0, 4096) },
        })
        .select('id')
        .single();

    if (auditErr) {
        console.error('[cashfree-webhook] audit insert failed', auditErr);
        // Continue — audit failure shouldn't lose the event upstream.
    }

    if (!sigValid) {
        return bad(401, 'invalid-signature');
    }

    if (!orderId) {
        await supabase.from('payment_events').update({ processed: true, error: 'no order_id' }).eq('id', eventRow?.id);
        return ok({ ignored: 'no-order-id' });
    }

    // --- 3. Find the pending subscription for this order_id ---
    const { data: sub, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('cashfree_order_id', orderId)
        .single();

    if (subErr || !sub) {
        await supabase.from('payment_events').update({ processed: true, error: 'subscription not found' }).eq('id', eventRow?.id);
        // Don't 500 — it could be a stray webhook from a deleted user. Audit + ack.
        return ok({ ignored: 'subscription-not-found' });
    }

    const planDays = PLAN_DAYS[sub.plan] || 30;

    // --- 4. Dispatch on event type ---
    let updateErr: any = null;

    switch (eventType) {
        case 'PAYMENT_SUCCESS_WEBHOOK': {
            // Idempotent: only flip if not already active. Replays land here harmlessly.
            const expiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();
            ({ error: updateErr } = await supabase
                .from('subscriptions')
                .update({
                    status:                'active',
                    cashfree_payment_id:   cashfreePayId ?? sub.cashfree_payment_id,
                    started_at:            new Date().toISOString(),
                    expires_at:            expiresAt,
                })
                .eq('id', sub.id));
            break;
        }

        case 'PAYMENT_FAILED_WEBHOOK': {
            ({ error: updateErr } = await supabase
                .from('subscriptions')
                .update({ status: 'expired' })
                .eq('id', sub.id)
                .eq('status', 'pending'));
            break;
        }

        case 'PAYMENT_USER_DROPPED_WEBHOOK': {
            // User abandoned the sheet. Leave 'pending' so they can retry without
            // double-charging. No DB change.
            break;
        }

        case 'SUBSCRIPTION_CHARGED': {
            // Auto-debit renewal — extend expires_at by plan.days from CURRENT expiry,
            // not now(), so consecutive renewals don't truncate.
            const base = new Date(sub.expires_at).getTime() || Date.now();
            const newExpiry = new Date(base + planDays * 24 * 60 * 60 * 1000).toISOString();
            ({ error: updateErr } = await supabase
                .from('subscriptions')
                .update({ status: 'active', expires_at: newExpiry })
                .eq('id', sub.id));
            break;
        }

        case 'SUBSCRIPTION_CANCELLED': {
            ({ error: updateErr } = await supabase
                .from('subscriptions')
                .update({ status: 'canceled', canceled_at: new Date().toISOString() })
                .eq('id', sub.id));
            break;
        }

        default: {
            // Unknown event — audit only, no state change.
            await supabase
                .from('payment_events')
                .update({ processed: true, error: `unhandled event: ${eventType}` })
                .eq('id', eventRow?.id);
            return ok({ ignored: 'unhandled-event-type', type: eventType });
        }
    }

    if (updateErr) {
        await supabase
            .from('payment_events')
            .update({ processed: true, error: `db update failed: ${updateErr.message}` })
            .eq('id', eventRow?.id);
        // Still 200 — we don't want Cashfree to spam retries while we manually fix.
        return ok({ ack_with_error: updateErr.message });
    }

    await supabase.from('payment_events').update({ processed: true }).eq('id', eventRow?.id);
    return ok({ processed: true, event: eventType });
});
