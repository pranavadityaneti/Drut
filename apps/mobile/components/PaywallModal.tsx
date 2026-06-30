/**
 * PaywallModal (mobile) — benefits sheet + "Subscribe on the web" CTA.
 *
 * STORE POLICY: we do NOT sell Drut Pro inside the mobile app. Apple (Guideline
 * 3.1.1) and Google Play require their native IAP for digital subscriptions
 * consumed in-app (~15-30% cut), and selling via a Razorpay WebView is a
 * near-certain rejection. Pro is sold ONLY on the web (drut.club).
 *
 * UPGRADE FLOW: the CTA does NOT bounce the user to a generic login page. We
 * mint a one-time, 2-min mobile->web handoff token (create-subscribe-handoff
 * edge fn), then open drut.club/subscribe?h=<token> in the SYSTEM BROWSER.
 * The web page redeems the token -> establishes a session for THIS exact user
 * -> goes straight to checkout. The token is opaque + single-use; the actual
 * login credential is minted server-side at redeem time and never touches
 * any URL/history/log. System browser is chosen over the in-app browser so
 * Razorpay's UPI app deep-links work reliably.
 */
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { X, BadgeCheck, Infinity as InfinityIcon, ListChecks, Timer, ExternalLink } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { createSubscribeHandoff } from '@drut/shared';

interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
    reason?: string; // optional context line, e.g. "You've used your 20 free questions today"
    // Legacy props retained for caller compatibility; the in-app purchase path was
    // removed (see file header) and these are intentionally ignored. The dead caller
    // wiring (RazorpayCheckoutModal + checkoutPlan state in dashboard/SprintEngine/
    // SessionEngine) is tracked for cleanup in forlater #3b.
    onUpgrade?: (...args: any[]) => void;
    isFirstTimer?: boolean;
    loading?: boolean;
}

const FEATURES = [
    { Icon: InfinityIcon, title: 'Unlimited practice', sub: 'No daily cap — practice as many questions as you want.' },
    { Icon: ListChecks, title: 'Every solution explained', sub: 'Quick Method + full step-by-step on every question.' },
    { Icon: Timer, title: 'Sprints & insights', sub: 'Timed speed sprints, focus areas, and progress analytics.' },
];

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, reason }) => {
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const { url } = await createSubscribeHandoff();
            const can = await Linking.canOpenURL(url);
            if (!can) throw new Error("Couldn't open your browser. Please visit drut.club/subscribe.");
            await Linking.openURL(url);
            onClose();
        } catch (e: any) {
            Alert.alert('Could not open checkout', e?.message || 'Please try again, or visit drut.club/subscribe directly.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ width: 28 }} />
                        <Text style={styles.headerTitle}>Drut Pro</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={22} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Badge */}
                    <View style={styles.badgeWrap}>
                        <View style={styles.badge}><BadgeCheck size={40} color={Colors.white} strokeWidth={2.2} /></View>
                        <Text style={styles.unlock}>Unlock everything</Text>
                        {reason ? <Text style={styles.reason}>{reason}</Text> : null}
                    </View>

                    {/* Features */}
                    <View style={styles.features}>
                        {FEATURES.map(({ Icon, title, sub }) => (
                            <View key={title} style={styles.featureRow}>
                                <View style={styles.featureIcon}><Icon size={20} color={Colors.primary} strokeWidth={2.2} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.featureTitle}>{title}</Text>
                                    <Text style={styles.featureSub}>{sub}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Primary CTA: subscribe on the web (via handoff) */}
                    <TouchableOpacity
                        style={[styles.cta, loading && styles.ctaDisabled]}
                        onPress={handleSubscribe}
                        activeOpacity={0.9}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.ctaText}>Subscribe on the web</Text>
                                <ExternalLink size={17} color={Colors.white} strokeWidth={2.4} />
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.note}>
                        We'll open <Text style={styles.noteStrong}>drut.club</Text> in your browser, already signed in to your Drut account.
                    </Text>

                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.maybeLater}>Maybe later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
    badgeWrap: { alignItems: 'center', marginTop: 14, marginBottom: 8 },
    badge: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    unlock: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 12 },
    reason: { fontSize: 12.5, color: Colors.textDim, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
    features: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, gap: 14, marginTop: 14 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
    featureTitle: { fontSize: 14.5, fontWeight: '700', color: Colors.text },
    featureSub: { fontSize: 12.5, color: Colors.textDim, marginTop: 1 },
    cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, height: 52, borderRadius: 26, marginTop: 20 },
    ctaDisabled: { opacity: 0.7 },
    ctaText: { fontSize: 16, fontWeight: '800', color: Colors.white },
    note: { fontSize: 12.5, color: Colors.textDim, textAlign: 'center', marginTop: 12, lineHeight: 18, paddingHorizontal: 12 },
    noteStrong: { fontWeight: '800', color: Colors.primary },
    maybeLater: { fontSize: 14, fontWeight: '700', color: Colors.textDim, textAlign: 'center', marginTop: 16, paddingVertical: 8 },
});

export default PaywallModal;
