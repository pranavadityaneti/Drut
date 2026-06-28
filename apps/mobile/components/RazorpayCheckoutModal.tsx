/**
 * RazorpayCheckoutModal (mobile) — opens Razorpay Standard Checkout inside an
 * in-app WebView (react-native-webview). No native module → works in Expo Go.
 *
 * Flow:
 *   1. createRazorpayOrder(plan) via @drut/shared (server derives the amount).
 *   2. Render an HTML page that loads Razorpay Checkout JS with the order.
 *   3. On payment success the page posts { payment_id, order_id, signature }
 *      back over the WebView bridge → we call verifyRazorpayPayment (server-side
 *      HMAC signature check) → onSuccess.
 *   4. On dismiss/failure → onClose / error message.
 *
 * SECURITY: only PUBLIC values cross the bridge into the page (key_id is the
 * publishable id; order_id + amount come from our server). The secret never
 * leaves the edge function. The signature is verified server-side, not here.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { createRazorpayOrder, verifyRazorpayPayment, isFreeGrant, PRICING, type PlanId, type CreateOrderResponse } from '@drut/shared';
import { Colors } from '../constants/Colors';

interface Props {
    visible: boolean;
    plan: PlanId | null;
    couponCode?: string | null;
    prefill?: { name?: string; email?: string; contact?: string };
    onClose: () => void;     // dismissed / cancelled / hard error (no charge)
    onSuccess: () => void;   // payment verified server-side, OR coupon made it free
}

function buildCheckoutHtml(
    order: CreateOrderResponse,
    description: string,
    prefill?: { name?: string; email?: string; contact?: string },
): string {
    const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Drut',
        description,
        theme: { color: '#5cbb21' },
        prefill: prefill || {},
        notes: { plan: order.plan, receipt: order.receipt },
    };
    // Functions can't be JSON-serialized, so attach handler/modal after injection.
    return `<!doctype html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"></head>
<body style="margin:0;background:#ffffff;">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(m){ if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } }
  var options = ${JSON.stringify(options)};
  options.handler = function(resp){ post({ type: 'success', data: resp }); };
  options.modal = { ondismiss: function(){ post({ type: 'dismiss' }); }, escape: true, backdropclose: false };
  try {
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(resp){ post({ type: 'failed', data: (resp && resp.error) || {} }); });
    rzp.open();
  } catch (e) {
    post({ type: 'failed', data: { description: String(e) } });
  }
</script>
</body>
</html>`;
}

export const RazorpayCheckoutModal: React.FC<Props> = ({ visible, plan, couponCode, prefill, onClose, onSuccess }) => {
    const [html, setHtml] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!visible || !plan) {
            setHtml(null);
            setErrorMsg(null);
            return;
        }
        (async () => {
            setLoading(true);
            setErrorMsg(null);
            try {
                const order = await createRazorpayOrder(plan, couponCode || undefined);
                if (cancelled) return;
                // Coupon made it free → granted directly, no WebView/checkout sheet.
                if (isFreeGrant(order)) {
                    onSuccess();
                    return;
                }
                setHtml(buildCheckoutHtml(order, PRICING[plan].label, prefill));
            } catch (e: any) {
                if (cancelled) return;
                setErrorMsg(e?.message || 'Could not start checkout. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [visible, plan, couponCode]);

    const handleMessage = async (event: WebViewMessageEvent) => {
        let msg: any;
        try {
            msg = JSON.parse(event.nativeEvent.data);
        } catch {
            return;
        }

        if (msg?.type === 'success' && msg.data) {
            setVerifying(true);
            try {
                await verifyRazorpayPayment({
                    razorpay_payment_id: msg.data.razorpay_payment_id,
                    razorpay_order_id: msg.data.razorpay_order_id,
                    razorpay_signature: msg.data.razorpay_signature,
                });
                onSuccess();
            } catch {
                setErrorMsg('We could not confirm your payment. If you were charged, contact support and we will sort it out.');
            } finally {
                setVerifying(false);
            }
        } else if (msg?.type === 'dismiss') {
            onClose();
        } else if (msg?.type === 'failed') {
            setErrorMsg(msg.data?.description || 'Payment failed. Please try again.');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Secure checkout</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Text style={styles.close}>Close</Text>
                    </TouchableOpacity>
                </View>

                {errorMsg ? (
                    <View style={styles.center}>
                        <Text style={styles.error}>{errorMsg}</Text>
                        <TouchableOpacity style={styles.retry} onPress={onClose}>
                            <Text style={styles.retryText}>Back</Text>
                        </TouchableOpacity>
                    </View>
                ) : (loading || !html) ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Starting secure checkout…</Text>
                    </View>
                ) : (
                    <WebView
                        originWhitelist={['*']}
                        source={{ html, baseUrl: 'https://drut.app' }}
                        onMessage={handleMessage}
                        javaScriptEnabled
                        domStorageEnabled
                        startInLoadingState
                    />
                )}

                {verifying && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color={Colors.white} />
                        <Text style={styles.overlayText}>Confirming payment…</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    title: { fontSize: 16, fontWeight: '700', color: Colors.text },
    close: { fontSize: 14, fontWeight: '600', color: Colors.primary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    loadingText: { fontSize: 13, color: Colors.textDim, marginTop: 10 },
    error: { fontSize: 14, color: Colors.error, textAlign: 'center', lineHeight: 20 },
    retry: { marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    retryText: { color: Colors.white, fontWeight: '700' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
    overlayText: { color: Colors.white, marginTop: 12, fontSize: 14, fontWeight: '600' },
});

export default RazorpayCheckoutModal;
