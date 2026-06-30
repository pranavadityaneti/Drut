/**
 * paymentService — client-side facade for the Razorpay payment flow + the
 * free-tier entitlement gate. Used by BOTH web (apps/web) and mobile
 * (apps/mobile) via @drut/shared.
 *
 * The checkout UI is platform-specific (web: Razorpay Checkout JS via
 * useRazorpayCheckout; mobile: react-native-webview), but everything BEFORE
 * the checkout sheet (creating the order) and AFTER (verifying the signature,
 * reading the subscription) lives here — single source of truth for both apps.
 */

import { getSupabase } from '../lib/supabase';
import type {
    CreateOrderResponse,
    VerifyPaymentResponse,
    RazorpaySuccessPayload,
    Subscription,
    OrderResult,
    Coupon,
    CouponPreview,
} from '../types/subscription';
import type { PlanId } from '../lib/pricing';
import { FREE_DAILY_QUESTION_LIMIT } from '../lib/pricing';

/**
 * Create a Razorpay order for the calling authenticated user, optionally applying
 * a coupon. The server re-derives the amount from pricing.ts and the coupon — the
 * client never sends an amount or a discount.
 *
 * Returns EITHER a Razorpay order (paid path) OR a FreeGrantResponse when a coupon
 * brings the price to ₹0 (the subscription is granted directly, no checkout sheet).
 * Use isFreeGrant() to discriminate.
 */
export async function createRazorpayOrder(plan: PlanId, couponCode?: string): Promise<OrderResult> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<OrderResult>('create-razorpay-order', {
        body: { plan, coupon_code: couponCode || undefined },
    });
    if (error) throw new Error(error.message || 'create-razorpay-order failed');
    if (!data) throw new Error('No response from create-razorpay-order');
    if ((data as any).free) return data;                       // free grant — no order
    if (!(data as CreateOrderResponse).order_id) throw new Error('No order_id returned');
    return data;
}

/**
 * Mint a one-time mobile -> web subscribe handoff URL. The opaque token is the
 * only thing in the returned URL; redemption (server-side, on /subscribe) is
 * what mints the actual login credential. Token is single-use and expires in
 * ~2 minutes. Returns a drut.club/subscribe?h=<token> URL for the CALLER user.
 */
export async function createSubscribeHandoff(): Promise<{ url: string; expires_at: string }> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<{ url: string; expires_at: string }>('create-subscribe-handoff', {
        body: {},
    });
    if (error) throw new Error(error.message || 'create-subscribe-handoff failed');
    if (!data?.url) throw new Error('No url returned from create-subscribe-handoff');
    return data;
}

/**
 * Validate a coupon for a plan WITHOUT committing — drives the paywall price
 * preview. Returns { valid, finalPaise, isFree, reason? }. The actual discount is
 * always re-computed server-side at order creation; this is display-only.
 */
export async function validateCoupon(plan: PlanId, couponCode: string): Promise<CouponPreview> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<CouponPreview>('validate-coupon', {
        body: { plan, coupon_code: couponCode },
    });
    if (error) return { valid: false, reason: error.message || 'Could not validate coupon' };
    return data ?? { valid: false, reason: 'Could not validate coupon' };
}

// ============================================================
// Admin coupon management (admin-gated edge fn: admin-coupons)
// ============================================================

export interface CreateCouponInput {
    code: string;
    type: 'percent' | 'flat' | 'fixed';
    value: number;                 // percent: 0..100 ; flat: rupees off ; fixed: final price in rupees (flat/fixed converted to paise server-side)
    applies_to_plan?: 'any' | 'monthly' | 'annual';
    max_redemptions?: number | null;
    per_user_limit?: number;
    expires_at?: string | null;
    note?: string;
}

export async function adminListCoupons(): Promise<Coupon[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<{ coupons: Coupon[] }>('admin-coupons', {
        body: { action: 'list' },
    });
    if (error) throw new Error(error.message || 'admin-coupons list failed');
    return data?.coupons ?? [];
}

export async function adminCreateCoupon(input: CreateCouponInput): Promise<Coupon> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<{ coupon: Coupon }>('admin-coupons', {
        body: { action: 'create', ...input },
    });
    if (error) throw new Error(error.message || 'admin-coupons create failed');
    if (!data?.coupon) throw new Error('Coupon not created');
    return data.coupon;
}

export async function adminSetCouponActive(id: string, active: boolean): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke('admin-coupons', {
        body: { action: 'set_active', id, active },
    });
    if (error) throw new Error(error.message || 'admin-coupons set_active failed');
}

/**
 * Verify the Razorpay signature after the user completes checkout. Pass the 3
 * fields Razorpay handed back in its success handler.
 *
 * On success the user's subscription row flips to 'active' server-side and this
 * resolves with { verified: true, plan, status, expires_at }. Throws on mismatch.
 */
export async function verifyRazorpayPayment(payload: RazorpaySuccessPayload): Promise<VerifyPaymentResponse> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<VerifyPaymentResponse>('verify-razorpay-payment', {
        body: payload,
    });
    if (error) throw new Error(error.message || 'verify-razorpay-payment failed');
    if (!data || !(data as any).verified) throw new Error('Signature mismatch');
    return data;
}

/**
 * Fetch the current user's most recent subscription row. Returns null if the
 * user has never subscribed (or RLS denies). Use isProActive(sub) to decide
 * pro state.
 */
export async function getCurrentSubscription(): Promise<Subscription | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) {
        // No subscriptions row OR RLS denial → treat as not pro (fail-safe).
        return null;
    }
    return (data as Subscription | null) ?? null;
}

/**
 * Pure helper — is this subscription currently entitling the user to Pro?
 * Active AND not expired by wall-clock.
 */
export function isProActive(sub: Subscription | null): boolean {
    if (!sub) return false;
    if (sub.status !== 'active') return false;
    const exp = new Date(sub.expires_at).getTime();
    return Number.isFinite(exp) && exp > Date.now();
}

/** Convenience: is the calling user currently a Pro subscriber? */
export async function isCurrentUserPro(): Promise<boolean> {
    return isProActive(await getCurrentSubscription());
}

/**
 * DISPLAY-ONLY: is the calling user eligible for the first-timer intro price?
 * Mirrors the server's rule (no subscription row past 'pending'). Used to decide
 * whether the paywall shows the ₹1,799 annual intro. The server re-derives the
 * actual charge independently — this only keeps the displayed price honest.
 * Defaults to true on error (the server is the source of truth for the amount).
 */
export async function isFirstTimerSubscriber(): Promise<boolean> {
    const supabase = getSupabase();
    const { count, error } = await supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'pending');
    if (error) return true;
    return (count ?? 0) === 0;
}

/**
 * Get today's question count for the calling user (server RPC). Used to decide
 * whether the free-tier paywall should fire on the next question fetch.
 */
export async function getTodayQuestionUsage(): Promise<number> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_today_question_usage');
    if (error) {
        // Fail CLOSED: never collapse an unreadable count into 0. Returning 0 on error
        // would let an exhausted free user slip past the daily cap every time the usage
        // RPC hiccups. Surface the error so the gate denies rather than serves.
        throw new Error(error.message || 'get_today_question_usage failed');
    }
    return typeof data === 'number' ? data : 0;
}

/**
 * Atomically increment today's question count and return the new value.
 * Call AFTER the user has answered (so abandoned questions don't count).
 */
export async function incrementDailyQuestionUsage(): Promise<number> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('increment_daily_question_usage');
    if (error) throw new Error(error.message || 'increment_daily_question_usage failed');
    return typeof data === 'number' ? data : 0;
}

// ============================================================
// Free-tier gate
// ============================================================

/**
 * Thrown when a free (non-Pro) user has consumed their daily free quota and
 * tries to fetch more questions. The UI catches this (via isPaywallError) and
 * shows the PaywallModal instead of an error.
 *
 * Identified by `.name === 'PaywallError'` rather than `instanceof` so it
 * survives bundler / transpile boundaries between packages.
 */
export class PaywallError extends Error {
    readonly reason: string;
    readonly used: number | undefined;
    readonly limit: number;
    constructor(reason: string, used?: number) {
        super(reason);
        this.name = 'PaywallError';
        this.reason = reason;
        this.used = used;
        this.limit = FREE_DAILY_QUESTION_LIMIT;
    }
}

/** Type guard for PaywallError that works across package boundaries. */
export function isPaywallError(e: unknown): e is PaywallError {
    return e instanceof Error && e.name === 'PaywallError';
}

/**
 * THE free-tier gate. Call before serving questions. Pro users pass through
 * unconditionally; free users pass only while under FREE_DAILY_QUESTION_LIMIT
 * for the current day. Throws PaywallError otherwise.
 *
 * This is the single chokepoint shared by web + mobile, practice + sprint — the
 * daily quota is a single unified pool across all question-serving paths.
 */
/**
 * How many free questions the calling user has LEFT today.
 *  - Pro (active, unexpired)  → Number.POSITIVE_INFINITY (unlimited).
 *  - Free                     → max(0, FREE_DAILY_QUESTION_LIMIT − usedToday).
 *
 * Fail-CLOSED: returns 0 if today's usage can't be read, so callers deny rather
 * than serve. Serving paths use this to CAP a batch fetch — without a cap, a single
 * gate check could be used to over-fetch (e.g. a 30-question sprint started at 19/20
 * used would hand out 11 extra free questions). This is the per-question enforcement
 * that the old per-batch gate lacked.
 */
export async function getRemainingFreeQuota(): Promise<number> {
    const sub = await getCurrentSubscription();
    if (isProActive(sub)) return Number.POSITIVE_INFINITY; // Pro → unlimited.

    let used: number;
    try {
        used = await getTodayQuestionUsage();
    } catch {
        // Fail CLOSED: can't confirm usage → treat as exhausted (deny, don't serve).
        return 0;
    }
    return Math.max(0, FREE_DAILY_QUESTION_LIMIT - used);
}

export async function assertWithinFreeQuota(): Promise<void> {
    if ((await getRemainingFreeQuota()) <= 0) {
        throw new PaywallError(
            `You've reached your ${FREE_DAILY_QUESTION_LIMIT} free questions for today (or we couldn't verify your usage). Upgrade to Drut Pro for unlimited practice.`,
        );
    }
}
