/**
 * PaywallModal (mobile) — "Upgrade to Pro" sheet.
 *
 * Shown when a free user hits the daily question limit (or taps Upgrade). Plans +
 * prices come from @drut/shared pricing.ts (single source of truth). The annual
 * plan shows the first-timer intro price for users who haven't subscribed before.
 * onUpgrade(plan) hands off to the Razorpay checkout.
 */
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, BadgeCheck, Infinity as InfinityIcon, ListChecks, Timer } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { PRICING, priceForPlan, type PlanId } from '@drut/shared';

interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
    onUpgrade: (plan: PlanId) => void;
    isFirstTimer?: boolean;
    loading?: boolean;
    reason?: string; // optional context line, e.g. "You've used your 20 free questions today"
}

const FEATURES = [
    { Icon: InfinityIcon, title: 'Unlimited practice', sub: 'No daily cap — practice as many questions as you want.' },
    { Icon: ListChecks, title: 'Every solution explained', sub: 'Quick Method + full step-by-step on every question.' },
    { Icon: Timer, title: 'Sprints & insights', sub: 'Timed speed sprints, focus areas, and progress analytics.' },
];

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, onUpgrade, isFirstTimer = true, loading = false, reason }) => {
    const [plan, setPlan] = useState<PlanId>('annual');

    const monthly = priceForPlan('monthly', isFirstTimer);
    const annual = priceForPlan('annual', isFirstTimer);
    const annualHasIntro = isFirstTimer && PRICING.annual.firstTimerAmountPaise != null;

    const PlanCard = ({ id, title, price, unit, note, strike }: { id: PlanId; title: string; price: number; unit: string; note?: string; strike?: number }) => {
        const selected = plan === id;
        return (
            <TouchableOpacity
                style={[styles.planCard, selected && styles.planCardActive]}
                onPress={() => setPlan(id)}
                activeOpacity={0.85}
            >
                <View style={styles.planTop}>
                    <Text style={styles.planTitle}>{title}</Text>
                    <View style={[styles.radio, selected && styles.radioActive]}>{selected && <View style={styles.radioDot} />}</View>
                </View>
                <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>₹{price.toLocaleString('en-IN')}</Text>
                    <Text style={styles.planUnit}>{unit}</Text>
                </View>
                {strike != null && <Text style={styles.strike}>₹{strike.toLocaleString('en-IN')}</Text>}
                {note && <Text style={styles.planNote}>{note}</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ width: 28 }} />
                        <Text style={styles.headerTitle}>Upgrade to Pro</Text>
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

                    {/* Plans */}
                    <View style={styles.plans}>
                        <PlanCard id="monthly" title="Monthly" price={monthly.rupees} unit="/month" note="Billed monthly" />
                        <PlanCard
                            id="annual"
                            title="Yearly"
                            price={annual.rupees}
                            unit="/year"
                            note={annualHasIntro ? 'First year — then ₹1,999/yr' : 'Billed yearly · best value'}
                            strike={annualHasIntro ? PRICING.annual.amountRupees : undefined}
                        />
                    </View>

                    {/* CTA */}
                    <TouchableOpacity style={[styles.cta, loading && { opacity: 0.7 }]} onPress={() => onUpgrade(plan)} disabled={loading} activeOpacity={0.9}>
                        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.ctaText}>Upgrade</Text>}
                    </TouchableOpacity>
                    <Text style={styles.footer}>Cancel anytime. Plans renew automatically.</Text>
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
    plans: { flexDirection: 'row', gap: 12, marginTop: 16 },
    planCard: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, padding: 14, backgroundColor: Colors.white },
    planCardActive: { borderColor: Colors.primary, backgroundColor: '#f3fbe9' },
    planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planTitle: { fontSize: 13.5, fontWeight: '600', color: Colors.textDim },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: Colors.primary },
    radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary },
    priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 8 },
    planPrice: { fontSize: 22, fontWeight: '800', color: Colors.text },
    planUnit: { fontSize: 12, color: Colors.textDim, marginBottom: 3 },
    strike: { fontSize: 12, color: Colors.textDim, textDecorationLine: 'line-through', marginTop: 2 },
    planNote: { fontSize: 11, color: Colors.textDim, marginTop: 4 },
    cta: { backgroundColor: Colors.primary, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    ctaText: { fontSize: 16, fontWeight: '800', color: Colors.white },
    footer: { fontSize: 11.5, color: Colors.textDim, textAlign: 'center', marginTop: 12 },
});

export default PaywallModal;
