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

/** Returned by the create-razorpay-order edge fn. */
export interface CreateOrderResponse {
    order_id: string;
    amount_paise: number;
    currency: 'INR';
    plan: PlanId;
    key_id: string;          // PUBLIC Razorpay key — client uses this to open the checkout
    receipt: string;
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
