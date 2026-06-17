/**
 * paymentService — client-side facade for the Razorpay payment flow.
 * Used by both web (apps/web) and mobile (apps/mobile) via @drut/shared.
 *
 * The actual checkout UI is platform-specific (web: Razorpay Checkout JS,
 * mobile: react-native-razorpay), but everything BEFORE the checkout
 * sheet (creating the order) and AFTER (verifying the signature, reading
 * the subscription) lives here.
 */

import { getSupabase } from '../lib/supabase';
import type {
    CreateOrderResponse,
    VerifyPaymentResponse,
    RazorpaySuccessPayload,
    Subscription,
} from '../types/subscription';
import type { PlanId } from '../lib/pricing';

/**
 * Create a Razorpay order for the calling authenticated user.
 * Returns { order_id, amount_paise, currency, plan, key_id }.
 * Pass order_id + key_id to the platform Razorpay Checkout SDK.
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
 * Verify the Razorpay signature after the user completes checkout.
 * Pass the 3 fields Razorpay handed back in its success handler.
 *
 * On success: the user's subscription row flips to 'active' server-side
 * and this resolves with { verified: true, plan, status, expires_at }.
 * On signature mismatch: throws.
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
 * Fetch the current user's most recent subscription row.
 * Returns null if the user has never subscribed.
 *
 * Use the `isProActive(sub)` helper below to decide pro state.
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
        // No subscriptions row OR RLS denial → treat as not pro.
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

/**
 * Get today's question count for the calling user (server RPC).
 * Use to decide whether to render the paywall on the next question.
 */
export async function getTodayQuestionUsage(): Promise<number> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_today_question_usage');
    if (error) return 0;
    return typeof data === 'number' ? data : 0;
}

/**
 * Atomically increment today's question count and return the new value.
 * Call AFTER the user has answered (so abandons don't count).
 */
export async function incrementDailyQuestionUsage(): Promise<number> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('increment_daily_question_usage');
    if (error) throw new Error(error.message || 'increment_daily_question_usage failed');
    return typeof data === 'number' ? data : 0;
}
