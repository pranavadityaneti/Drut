/**
 * Pricing — single source of truth for plans, amounts, and the free-tier quota.
 *
 * SECURITY: the server (supabase/functions/create-razorpay-order) MUST re-derive
 * the amount from this table by planId + first-timer status. NEVER trust a
 * client-sent amount. Keep server and client in sync.
 *
 * Decided 2026-06-26: Monthly ₹199 · Annual ₹1999 (₹1799 first-timer intro) ·
 * 20 free questions/day. See memory project_pricing.
 */

export type PlanId = 'monthly' | 'annual';

export interface PlanSpec {
    id: PlanId;
    label: string;
    amountPaise: number;            // standard price, in paise (19900 = ₹199)
    amountRupees: number;           // for display
    firstTimerAmountPaise?: number; // one-time intro price for users who never subscribed
    firstTimerAmountRupees?: number;
    days: number;                   // access duration once active
    tagline: string;                // shown on the paywall
}

export const PRICING: Record<PlanId, PlanSpec> = {
    monthly: {
        id: 'monthly',
        label: 'Drut Pro · Monthly',
        amountPaise: 19900,
        amountRupees: 199,
        days: 30,
        tagline: 'Renews monthly. Cancel anytime.',
    },
    annual: {
        id: 'annual',
        label: 'Drut Pro · Annual',
        amountPaise: 199900,
        amountRupees: 1999,
        firstTimerAmountPaise: 179900,
        firstTimerAmountRupees: 1799,
        days: 365,
        tagline: '₹1,799 your first year (intro), then ₹1,999/yr. Best value.',
    },
};

/**
 * Effective price for a plan given whether the user is a first-time subscriber.
 * The annual plan gets the ₹1,799 intro price on a user's FIRST subscription.
 */
export function priceForPlan(plan: PlanId, isFirstTimer: boolean): { paise: number; rupees: number } {
    const p = PRICING[plan];
    if (plan === 'annual' && isFirstTimer && p.firstTimerAmountPaise) {
        return { paise: p.firstTimerAmountPaise, rupees: p.firstTimerAmountRupees! };
    }
    return { paise: p.amountPaise, rupees: p.amountRupees };
}

/** Free-tier limit: questions answered per calendar day before the paywall triggers. */
export const FREE_DAILY_QUESTION_LIMIT = 20;

/** Format paise as an Indian-rupee string, e.g. 19900 -> "₹199". */
export function formatINR(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}
