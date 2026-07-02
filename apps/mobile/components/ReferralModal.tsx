/**
 * ReferralModal — the "Refer & Earn" bottom sheet opened from Profile → Share Drut.
 *
 * Layout follows the reference: hero image, "get 1 month free" chip, title +
 * subtitle, a 3-step "how it works", the user's invite link with Copy, and a
 * primary Share button.
 *
 * NATIVE DEPENDENCIES (must be in the native build — NOT OTA-deliverable):
 *   - expo-clipboard (Copy Link)
 * Share is core RN. The hero image is assets/refer-hero.png (swap in the
 * fingers-pointing artwork — placeholder ships until then).
 *
 * code === null → link isn't ready yet; Copy/Share fall back gracefully so the
 * sheet is never a dead end.
 */
import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Image,
    Share,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Zap, Crown, UserPlus, X, Copy, Check } from 'lucide-react-native';
import { referralLink } from '@drut/shared';

const INK = '#16261a';
const MUTED = '#7c827b';
const ACCENT = '#b4fa8d';
const ACCENT_SOFT = '#eaf6dd';
const SUCCESS = '#3b6d11';
const BORDER = '#e6ebe1';

interface Props {
    visible: boolean;
    onClose: () => void;
    code: string | null;
}

const STEPS = [
    { icon: Zap, text: 'Share your invite link' },
    { icon: Crown, text: 'Your friend gets 1 month free when they subscribe to the yearly plan' },
    { icon: UserPlus, text: 'You get 1 month free for every friend who subscribes' },
] as const;

export const ReferralModal: React.FC<Props> = ({ visible, onClose, code }) => {
    const insets = useSafeAreaInsets();
    const [copied, setCopied] = useState(false);

    const link = code ? referralLink(code) : null;

    const handleCopy = async () => {
        if (!link) return;
        try {
            await Clipboard.setStringAsync(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            /* clipboard unavailable — no-op */
        }
    };

    const handleShare = async () => {
        const message = link
            ? `Join me on Drut — practice smarter for your entrance exams. We both get 1 month free when you subscribe to the yearly plan.\n\n${link}`
            : 'Practice smarter for your entrance exams with Drut — https://drut.club';
        try {
            await Share.share({ message });
        } catch {
            /* dismissed */
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.handle} />

                <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color={MUTED} />
                </TouchableOpacity>

                {/* Hero */}
                <View style={styles.heroWrap}>
                    <Image source={require('../assets/refer-hero.png')} style={styles.hero} resizeMode="cover" />
                </View>

                {/* Chip + title */}
                <View style={styles.chip}>
                    <Text style={styles.chipText}>Get 1 month free</Text>
                </View>
                <Text style={styles.title}>Refer & Earn</Text>
                <Text style={styles.subtitle}>Invite a friend — you both get a free month of Pro.</Text>

                {/* How it works */}
                <View style={styles.steps}>
                    {STEPS.map(({ icon: Icon, text }, i) => (
                        <View key={i} style={[styles.stepRow, i < STEPS.length - 1 && { marginBottom: 14 }]}>
                            <View style={styles.stepIcon}>
                                <Icon size={16} color={SUCCESS} />
                            </View>
                            <Text style={styles.stepText}>{text}</Text>
                        </View>
                    ))}
                </View>

                {/* Invite link */}
                <Text style={styles.linkLabel}>Your invite link</Text>
                <View style={styles.linkRow}>
                    <Text style={styles.linkText} numberOfLines={1}>
                        {link ? link.replace(/^https:\/\//, '') : 'Preparing your link…'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.copyBtn, (!link || copied) && styles.copyBtnDisabled]}
                        onPress={handleCopy}
                        disabled={!link}
                        activeOpacity={0.8}
                    >
                        {copied ? <Check size={14} color={INK} /> : <Copy size={14} color={INK} />}
                        <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Share CTA */}
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                    {!code ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.shareText}>Share invite</Text>
                    )}
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(11,20,12,0.45)' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 10,
    },
    handle: {
        alignSelf: 'center',
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#dfe4da',
        marginBottom: 8,
    },
    closeBtn: { position: 'absolute', top: 14, right: 16, zIndex: 2, padding: 4 },

    heroWrap: {
        height: 150,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: ACCENT_SOFT,
        marginTop: 4,
        marginBottom: 18,
    },
    hero: { width: '100%', height: '100%' },

    chip: {
        alignSelf: 'flex-start',
        backgroundColor: ACCENT_SOFT,
        paddingHorizontal: 11, paddingVertical: 5,
        borderRadius: 999,
        marginBottom: 10,
    },
    chipText: { color: SUCCESS, fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
    title: { fontSize: 26, fontWeight: '800', color: INK, letterSpacing: -0.5 },
    subtitle: { fontSize: 14.5, color: MUTED, marginTop: 5, lineHeight: 20 },

    steps: { marginTop: 22, marginBottom: 22 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepIcon: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: ACCENT_SOFT,
        alignItems: 'center', justifyContent: 'center',
    },
    stepText: { flex: 1, fontSize: 14, color: INK, lineHeight: 19 },

    linkLabel: { fontSize: 12, color: MUTED, fontWeight: '600', marginBottom: 8 },
    linkRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f4f6f1',
        borderRadius: 14,
        borderWidth: 1, borderColor: BORDER,
        paddingLeft: 14, paddingRight: 6, paddingVertical: 6,
        marginBottom: 16,
    },
    linkText: { flex: 1, fontSize: 13.5, color: INK, fontWeight: '600' },
    copyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: ACCENT,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 10,
    },
    copyBtnDisabled: { opacity: 0.5 },
    copyText: { color: INK, fontSize: 13, fontWeight: '700' },

    shareBtn: {
        backgroundColor: INK,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    shareText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
