/**
 * Pricing — single source of truth for plans, amounts, and the free-tier quota.
 *
 * Mirrored on the server in supabase/functions/create-cashfree-order/index.ts.
 * KEEP IN SYNC. If the price changes, update both.
 */

export type PlanId = 'monthly' | 'annual';

export interface PlanSpec {
    id: PlanId;
    label: string;
    amountPaise: number;   // 29900 = ₹299
    amountRupees: number;  // for display
    days: number;          // duration once active
    tagline: string;       // shown on paywall
}

export const PRICING: Record<PlanId, PlanSpec> = {
    monthly: {
        id: 'monthly',
        label: 'Drut Pro Monthly',
        amountPaise: 29900,
        amountRupees: 299,
        days: 30,
        tagline: 'Renews monthly. Cancel anytime.',
    },
    annual: {
        id: 'annual',
        label: 'Drut Pro Annual',
        amountPaise: 149900,
        amountRupees: 1499,
        days: 365,
        // 1499/12 ≈ 124.92, vs 299 monthly → ~58% off
        tagline: '58% off vs monthly. Best value.',
    },
};

/** Free-tier limit: questions answered per calendar day before paywall. */
export const FREE_DAILY_QUESTION_LIMIT = 15;

/** Convenience format helpers. */
export function formatINR(paise: number): string {
    const rupees = paise / 100;
    return rupees.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}
