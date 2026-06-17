/**
 * paymentService — client-side facade for the Cashfree payment flow.
 * Used by both web (apps/web) and mobile (apps/mobile) via @drut/shared.
 *
 * The actual checkout UI is platform-specific (web: Cashfree JS SDK,
 * mobile: react-native-cashfree-pg-sdk), but everything BEFORE the
 * checkout sheet (creating the order) and AFTER (reading the resulting
 * subscription) lives here.
 */

import { getSupabase } from '../lib/supabase';
import type { CreateOrderResponse, Subscription } from '../types/subscription';
import type { PlanId } from '../lib/pricing';

/**
 * Create a Cashfree order for the calling authenticated user.
 * Returns the payment_session_id the platform SDK consumes.
 */
export async function createCashfreeOrder(plan: PlanId): Promise<CreateOrderResponse> {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke<CreateOrderResponse>('create-cashfree-order', {
        body: { plan },
    });
    if (error) throw new Error(error.message || 'create-cashfree-order failed');
    if (!data || !data.payment_session_id) throw new Error('No payment_session_id returned');
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
