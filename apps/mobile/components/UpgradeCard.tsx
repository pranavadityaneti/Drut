import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Crown, Check } from 'lucide-react-native';

interface Props {
    isPro: boolean;
    onUpgrade: () => void;
}

/**
 * "Go Pro" card. Background = a soft green gradient image (assets/go-pro-bg.png).
 * Because that image is bright, the copy is DARK ink and the CTA is a dark-green
 * "glass" pill — a translucent fill + frosted light rim (NO native blur module,
 * so the card ships over-the-air with no rebuild).
 *   - Free user → "Go Pro" + glass Upgrade button (opens the paywall → Razorpay)
 *   - Pro user  → "Pro member · All features unlocked" + glass Active chip
 */
const INK = '#0d3517';

export const UpgradeCard: React.FC<Props> = ({ isPro, onUpgrade }) => {
    return (
        <ImageBackground
            source={require('../assets/go-pro-bg.png')}
            resizeMode="cover"
            style={styles.card}
            imageStyle={styles.image}
        >
            <View style={styles.content}>
                <View style={styles.textCol}>
                    <Text style={styles.title}>{isPro ? 'Pro member' : 'Go Pro'}</Text>
                    <Text style={styles.subtitle}>
                        {isPro ? 'All features unlocked' : 'Unlimited practice, every solution, and Sprints'}
                    </Text>
                </View>

                {isPro ? (
                    <View style={styles.glassChip}>
                        <Check size={14} color="#eafff0" strokeWidth={3} />
                        <Text style={styles.glassText}>Active</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.glassBtn} onPress={onUpgrade} activeOpacity={0.85}>
                        <Crown size={15} color="#eafff0" />
                        <Text style={styles.glassText}>Upgrade</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        minHeight: 140,
        justifyContent: 'center',
        shadowColor: '#10481b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    image: { borderRadius: 20 },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 22,
        paddingVertical: 22,
    },
    textCol: {
        flex: 1,
    },
    title: {
        fontSize: 25,
        fontWeight: '800',
        color: INK,
        letterSpacing: -0.4,
    },
    subtitle: {
        fontSize: 13.5,
        color: 'rgba(13,53,23,0.78)',
        marginTop: 4,
        lineHeight: 19,
        fontWeight: '600',
    },
    glassBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: 'rgba(8,38,17,0.55)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.45)',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 11,
        shadowColor: '#0a2e12',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    glassChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(8,38,17,0.55)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.45)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    glassText: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#ffffff',
    },
});
