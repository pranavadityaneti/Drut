// Server-side pricing — the authoritative source for charged amounts (mirror of
// @drut/shared/lib/pricing.ts; KEEP IN SYNC). The client never sends an amount.
// Decided 2026-06-26: monthly ₹199, annual ₹1999 (₹1799 first-timer intro).

import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SERVER_PRICING: Record<'monthly' | 'annual', {
    amount_paise: number;
    first_timer_amount_paise?: number;
    days: number;
    label: string;
}> = {
    monthly: { amount_paise: 19900,                                   days: 30,  label: 'Drut Pro · Monthly' },
    annual:  { amount_paise: 199900, first_timer_amount_paise: 179900, days: 365, label: 'Drut Pro · Annual'  },
};

/** Effective amount in paise for a plan, given first-timer status (mirrors priceForPlan). */
export function amountPaiseFor(plan: 'monthly' | 'annual', isFirstTimer: boolean): number {
    const spec = SERVER_PRICING[plan];
    if (plan === 'annual' && isFirstTimer && spec.first_timer_amount_paise) {
        return spec.first_timer_amount_paise;
    }
    return spec.amount_paise;
}

/**
 * First-timer = no subscription row that ever progressed past 'pending'.
 * Abandoned checkouts (pending-only) keep the intro available. Fails SAFE
 * (returns false → standard price) if the lookup errors.
 */
export async function isFirstTimerSubscriber(svc: SupabaseClient, userId: string): Promise<boolean> {
    const { count, error } = await svc
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'pending');
    if (error) {
        console.error('[pricing] first-timer lookup failed', error);
        return false;
    }
    return (count ?? 0) === 0;
}
