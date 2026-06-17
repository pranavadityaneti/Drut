/**
 * Subscription + payment-related types. Mirrors the public.subscriptions
 * and public.question_reports tables (migrations 20260617120100, _120000).
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

/** Returned by create-razorpay-order edge fn. */
export interface CreateOrderResponse {
    order_id: string;
    amount_paise: number;
    currency: 'INR';
    plan: PlanId;
    key_id: string;          // public Razorpay key — client uses this to open the modal
    receipt: string;
}

/** Returned by verify-razorpay-payment edge fn on success. */
export interface VerifyPaymentResponse {
    verified: true;
    plan: PlanId;
    status: 'active';
    expires_at: string;
}

/** What the Razorpay Checkout JS hands back to us on success. */
export interface RazorpaySuccessPayload {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export type ReportCategory = 'wrong-answer' | 'typo' | 'unclear' | 'other';
export type ReportClient   = 'web' | 'mobile-ios' | 'mobile-android';
export type ReportStatus   = 'open' | 'triaged' | 'resolved' | 'dismissed';

export interface QuestionReport {
    id: string;
    user_id: string | null;
    question_id: string;
    category: ReportCategory;
    message: string | null;
    status: ReportStatus;
    exam_profile: string | null;
    subject: string | null;
    client: ReportClient | null;
    created_at: string;
    triaged_at: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    admin_notes: string | null;
}

export interface QuestionReportSubmit {
    question_id: string;
    category: ReportCategory;
    message?: string;
    exam_profile?: string;
    subject?: string;
    client: ReportClient;
}
