/**
 * Subscription + payment types. Mirrors the public.subscriptions table
 * (migration 20260627120100_subscriptions.sql) and the Razorpay edge-fn
 * request/response contracts.
 */

import type { PlanId } from '../lib/pricing';

export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface Subscription {
    id: string;
    user_id: string;
    plan: PlanId;
    status: SubscriptionStatus;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    razorpay_subscription_id: string | null;
    razorpay_signature: string | null;
    amount_paise: number;
    currency: 'INR';
    started_at: string;
    expires_at: string;
    canceled_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Returned by the create-razorpay-order edge fn — PAID path (Razorpay). */
export interface CreateOrderResponse {
    order_id: string;
    amount_paise: number;
    currency: 'INR';
    plan: PlanId;
    key_id: string;          // PUBLIC Razorpay key — client uses this to open the checkout
    receipt: string;
    coupon_code?: string;    // echoed back if a coupon discounted this order
}

/**
 * Returned by create-razorpay-order when a coupon brings the price to ₹0 — the
 * subscription is granted directly (no Razorpay, which rejects sub-₹1 orders).
 * The client treats this as an immediate success (no checkout sheet).
 */
export interface FreeGrantResponse {
    free: true;
    plan: PlanId;
    status: 'active';
    expires_at: string;
}

/** create-razorpay-order returns either a Razorpay order or a direct free grant. */
export type OrderResult = CreateOrderResponse | FreeGrantResponse;

export function isFreeGrant(r: OrderResult): r is FreeGrantResponse {
    return (r as FreeGrantResponse).free === true;
}

/** Coupon row (admin views + management). Codes are stored UPPERCASE. */
export interface Coupon {
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
    note: string | null;
    created_at: string;
    updated_at: string;
}

/** Result of validate-coupon — drives the paywall price preview. */
export interface CouponPreview {
    valid: boolean;
    reason?: string;               // why invalid (shown to the user) when valid=false
    code?: string;                 // normalized (uppercase) code when valid
    originalPaise?: number;
    discountPaise?: number;
    finalPaise?: number;
    isFree?: boolean;              // true when finalPaise === 0
}

/** Returned by the verify-razorpay-payment edge fn on success. */
export interface VerifyPaymentResponse {
    verified: true;
    plan: PlanId;
    status: 'active';
    expires_at: string;
}

/** The 3 fields Razorpay Checkout hands back on a successful payment. */
export interface RazorpaySuccessPayload {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}
