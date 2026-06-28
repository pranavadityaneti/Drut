/**
 * useRazorpayCheckout — WEB-ONLY hook that opens the Razorpay Standard
 * Checkout modal for a given plan.
 *
 * Flow:
 *   1. Lazily loads https://checkout.razorpay.com/v1/checkout.js (once per session).
 *   2. Calls createRazorpayOrder() to get order_id + key_id from our edge fn.
 *   3. Opens the Razorpay modal.
 *   4. On payment success → verifyRazorpayPayment() (server-side signature check).
 *   5. Resolves with { verified: true, plan, status, expires_at } or throws.
 *
 * MOBILE: do NOT use this hook on React Native — there's no DOM. Mobile uses an
 * in-app WebView (react-native-webview) that loads the same Checkout JS; that
 * mobile entrypoint lives in apps/mobile (useRazorpayWebCheckout / RazorpayWebView).
 */

import { useCallback, useRef, useState } from 'react';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/paymentService';
import type { PlanId } from '../lib/pricing';
import { PRICING } from '../lib/pricing';
import type { RazorpaySuccessPayload, VerifyPaymentResponse } from '../types/subscription';

interface RazorpayInstance {
    open: () => void;
    on?: (event: string, cb: (resp: unknown) => void) => void;
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: 'INR';
    name: string;
    description?: string;
    image?: string;
    order_id: string;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string };
    handler: (response: RazorpaySuccessPayload) => void;
    modal?: { ondismiss?: () => void };
}

declare global {
    interface Window {
        Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
    }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('useRazorpayCheckout is browser-only'));
    }
    if (window.Razorpay) return Promise.resolve();
    if (scriptLoadPromise) return scriptLoadPromise;

    scriptLoadPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${RAZORPAY_SCRIPT_URL}"]`,
        );
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('razorpay-script-failed')));
            return;
        }
        const s = document.createElement('script');
        s.src = RAZORPAY_SCRIPT_URL;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
            scriptLoadPromise = null; // allow retry
            reject(new Error('razorpay-script-failed'));
        };
        document.head.appendChild(s);
    });
    return scriptLoadPromise;
}

export interface UseRazorpayCheckoutOptions {
    /** Display name (top of the modal). Defaults to "Drut". */
    name?: string;
    /** Logo URL (top of the modal). */
    image?: string;
    /** Theme color (CTA + accents). Defaults to Drut green. */
    themeColor?: string;
    /** Prefill the customer fields so the modal is friction-free. */
    prefill?: { name?: string; email?: string; contact?: string };
}

export interface UseRazorpayCheckoutReturn {
    /** Open the Razorpay modal for the given plan. Resolves on verified payment. */
    pay: (plan: PlanId) => Promise<VerifyPaymentResponse>;
    /** True while loading the script, creating the order, or modal is open. */
    busy: boolean;
    /** Last error from the flow (script load, order creation, signature mismatch). */
    error: Error | null;
}

export function useRazorpayCheckout(opts: UseRazorpayCheckoutOptions = {}): UseRazorpayCheckoutReturn {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const busyRef = useRef(false);

    const pay = useCallback(async (plan: PlanId): Promise<VerifyPaymentResponse> => {
        if (busyRef.current) throw new Error('checkout-already-open');
        busyRef.current = true;
        setBusy(true);
        setError(null);

        try {
            // 1. Load the script (lazy, cached).
            await loadRazorpayScript();
            if (!window.Razorpay) throw new Error('razorpay-script-missing');

            // 2. Create the order via our edge fn (server derives the amount).
            const order = await createRazorpayOrder(plan);
            const planSpec = PRICING[plan];

            // 3. Open the modal and await success/dismiss via a promise.
            const result = await new Promise<VerifyPaymentResponse>((resolve, reject) => {
                const rzp = new window.Razorpay!({
                    key: order.key_id,
                    amount: order.amount_paise,
                    currency: order.currency,
                    order_id: order.order_id,
                    name: opts.name || 'Drut',
                    description: planSpec.label,
                    image: opts.image,
                    prefill: opts.prefill,
                    theme: { color: opts.themeColor || '#5cbb21' },
                    notes: { plan, receipt: order.receipt },
                    handler: (resp) => {
                        // 4. Verify signature server-side.
                        verifyRazorpayPayment(resp).then(resolve).catch(reject);
                    },
                    modal: {
                        ondismiss: () => reject(new Error('checkout-dismissed')),
                    },
                });
                rzp.open();
            });

            return result;
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            setError(e);
            throw e;
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, [opts.name, opts.image, opts.themeColor, opts.prefill]);

    return { pay, busy, error };
}
