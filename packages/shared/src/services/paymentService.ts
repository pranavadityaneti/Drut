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
} from '../types/subscription';
import type { PlanId } from '../lib/pricing';
import { FREE_DAILY_QUESTION_LIMIT } from '../lib/pricing';

/**
 * Create a Razorpay order for the calling authenticated user.
 * Returns { order_id, amount_paise, currency, plan, key_id }. The server
 * re-derives the amount from pricing.ts — the client never sends it.
 */
export async function createRazorpayOrder(plan: PlanId): Promise<CreateOrderResponse> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<CreateOrderResponse>('create-razorpay-order', {
        body: { plan },
    });
    if (error) throw new Error(error.message || 'create-razorpay-order failed');
    if (!data || !data.order_id) throw new Error('No order_id returned');
    return data;
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
    if (error) return 0;
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
export async function assertWithinFreeQuota(): Promise<void> {
    const sub = await getCurrentSubscription();
    if (isProActive(sub)) return; // Pro → unlimited.

    const used = await getTodayQuestionUsage();
    if (used >= FREE_DAILY_QUESTION_LIMIT) {
        throw new PaywallError(
            `You've used your ${FREE_DAILY_QUESTION_LIMIT} free questions for today. Upgrade to Drut Pro for unlimited practice.`,
            used,
        );
    }
}
