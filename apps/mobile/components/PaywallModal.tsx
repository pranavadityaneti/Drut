/**
 * PaywallModal (mobile) — Pro benefits sheet (NO in-app purchase).
 *
 * STORE POLICY: we deliberately do NOT sell the Pro subscription inside the mobile app.
 * Apple (App Store Review Guideline 3.1.1) and Google Play require their native In-App
 * Purchase for digital subscriptions consumed in-app (a ~15–30% cut), and selling via a
 * Razorpay WebView in-app is a near-certain rejection. So Pro is sold ONLY on the web
 * (drut.club, via Razorpay), and this sheet just showcases the benefits and points users
 * to the web to subscribe/manage. There is no in-app purchase and no external buy button.
 *
 * The onUpgrade/isFirstTimer/loading props are retained for caller compatibility but are
 * intentionally unused — callers' Razorpay checkout is never triggered from here.
 */
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X, BadgeCheck, Infinity as InfinityIcon, ListChecks, Timer, Globe } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import type { PlanId } from '@drut/shared';

interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
    onUpgrade?: (plan: PlanId, couponCode?: string) => void; // retained for caller compat; not used
    isFirstTimer?: boolean;
    loading?: boolean;
    reason?: string; // optional context line, e.g. "You've used your 20 free questions today"
}

const FEATURES = [
    { Icon: InfinityIcon, title: 'Unlimited practice', sub: 'No daily cap — practice as many questions as you want.' },
    { Icon: ListChecks, title: 'Every solution explained', sub: 'Quick Method + full step-by-step on every question.' },
    { Icon: Timer, title: 'Sprints & insights', sub: 'Timed speed sprints, focus areas, and progress analytics.' },
];

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, reason }) => {
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

                    {/* Web-only subscription note (no in-app purchase — store policy) */}
                    <View style={styles.webNote}>
                        <Globe size={18} color={Colors.primary} strokeWidth={2.2} />
                        <Text style={styles.webNoteText}>
                            Drut Pro is managed on the web. Visit <Text style={styles.webNoteStrong}>drut.club</Text> in any browser to subscribe or manage your plan.
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.cta} onPress={onClose} activeOpacity={0.9}>
                        <Text style={styles.ctaText}>Got it</Text>
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
    webNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f3fbe9', borderRadius: 16, padding: 14, marginTop: 16 },
    webNoteText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 19 },
    webNoteStrong: { fontWeight: '800', color: Colors.primary },
    cta: { backgroundColor: Colors.primary, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    ctaText: { fontSize: 16, fontWeight: '800', color: Colors.white },
});

export default PaywallModal;
