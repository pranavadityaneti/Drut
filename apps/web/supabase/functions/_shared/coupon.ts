// Shared coupon validation + pricing for the Razorpay edge functions.
// Used by create-razorpay-order (apply) and validate-coupon (preview). All
// discount math is server-side — the client never sends an amount or discount.

import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CouponRow {
    id: string;
    code: string;
    type: 'percent' | 'flat';
    value: number;                 // percent: 0..100 ; flat: paise off
    applies_to_plan: 'any' | 'monthly' | 'annual';
    max_redemptions: number | null;
    times_redeemed: number;
    per_user_limit: number;
    expires_at: string | null;
    active: boolean;
}

export interface CouponResult {
    ok: boolean;
    reason?: string;               // user-facing message when !ok
    coupon?: CouponRow;
    discountPaise: number;
    finalPaise: number;
}

/**
 * Validate a coupon for (user, plan) against a base price and compute the final
 * price. Limits (max_redemptions + per_user_limit) are checked against the
 * authoritative coupon_redemptions rows, not the denormalized counter.
 */
export async function validateAndPriceCoupon(
    svc: SupabaseClient,
    rawCode: string,
    plan: 'monthly' | 'annual',
    userId: string,
    basePaise: number,
): Promise<CouponResult> {
    const code = (rawCode || '').trim().toUpperCase();
    const fail = (reason: string): CouponResult => ({ ok: false, reason, discountPaise: 0, finalPaise: basePaise });

    if (!code) return fail('Enter a coupon code');

    const { data: coupon, error } = await svc
        .from('coupons')
        .select('*')
        .eq('code', code)
        .maybeSingle();

    if (error) return fail('Could not check that coupon');
    if (!coupon || !coupon.active) return fail('Invalid coupon code');
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return fail('This coupon has expired');
    if (coupon.applies_to_plan !== 'any' && coupon.applies_to_plan !== plan) {
        return fail(`This coupon only applies to the ${coupon.applies_to_plan} plan`);
    }

    // Total redemptions (authoritative) vs max.
    if (coupon.max_redemptions != null) {
        const { count: total } = await svc
            .from('coupon_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id);
        if ((total ?? 0) >= coupon.max_redemptions) return fail('This coupon has been fully redeemed');
    }

    // Per-user limit.
    const { count: mine } = await svc
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId);
    if ((mine ?? 0) >= coupon.per_user_limit) return fail('You have already used this coupon');

    const discount = coupon.type === 'percent'
        ? Math.floor((basePaise * coupon.value) / 100)
        : Math.min(coupon.value, basePaise);
    const finalPaise = Math.max(0, basePaise - discount);

    return { ok: true, coupon: coupon as CouponRow, discountPaise: discount, finalPaise };
}

/**
 * Record a successful redemption: audit row + best-effort counter bump.
 * Call ONLY after the subscription is actually granted/paid.
 */
export async function recordRedemption(
    svc: SupabaseClient,
    couponId: string,
    userId: string,
    subscriptionId: string | null,
): Promise<void> {
    await svc.from('coupon_redemptions').insert({
        coupon_id: couponId,
        user_id: userId,
        subscription_id: subscriptionId,
    });
    // Denormalized display counter (authoritative count lives in coupon_redemptions).
    const { data: c } = await svc.from('coupons').select('times_redeemed').eq('id', couponId).single();
    await svc.from('coupons').update({ times_redeemed: ((c?.times_redeemed ?? 0) + 1) }).eq('id', couponId);
}
