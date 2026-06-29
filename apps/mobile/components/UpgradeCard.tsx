import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Crown, Check } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface Props {
    isPro: boolean;
    onUpgrade: () => void;
}

/**
 * Home-screen upgrade card. Drut-green gradient (SVG, no native gradient dep), with a
 * Crown "Pro" mark. Two states:
 *   - Free user  → "Go Pro" + Upgrade button (opens the real paywall → Razorpay checkout)
 *   - Pro user   → "Pro member · All features unlocked!" + Active badge (no CTA)
 */
export const UpgradeCard: React.FC<Props> = ({ isPro, onUpgrade }) => {
    return (
        <View style={styles.card}>
            {/* Gradient background (clipped by the card's rounded corners + overflow:hidden) */}
            <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                    <LinearGradient id="upgradeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#10481b" />
                        <Stop offset="100%" stopColor="#4e9e2c" />
                    </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#upgradeGrad)" />
            </Svg>

            {/* Faint oversized crown watermark, bottom-right */}
            <View style={styles.watermark} pointerEvents="none">
                <Crown size={170} color="#ffffff" opacity={0.07} />
            </View>

            <View style={styles.content}>
                <View style={styles.textCol}>
                    <Text style={styles.title}>{isPro ? 'Pro member' : 'Go Pro'}</Text>
                    <Text style={styles.subtitle}>
                        {isPro ? 'All features unlocked!' : 'Unlock unlimited practice & every feature.'}
                    </Text>

                    {isPro ? (
                        <View style={styles.activeBadge}>
                            <Check size={14} color={Colors.primary} strokeWidth={3} />
                            <Text style={styles.activeText}>Active</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.85}>
                            <Text style={styles.upgradeText}>Upgrade</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.mark}>
                    <Crown size={30} color={Colors.primary} fill={Colors.secondary} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        minHeight: 132,
        justifyContent: 'center',
        shadowColor: '#10481b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 5,
    },
    watermark: {
        position: 'absolute',
        right: -28,
        bottom: -40,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 14,
    },
    textCol: { flex: 1 },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
        lineHeight: 19,
    },
    upgradeBtn: {
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 26,
        paddingVertical: 11,
        marginTop: 16,
    },
    upgradeText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#10481b',
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        marginTop: 16,
    },
    activeText: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.primary,
    },
    mark: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
    },
});
