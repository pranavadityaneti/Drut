import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useState } from 'react';
import { useProfileSetup } from '../../../contexts/ProfileSetupContext';

const REFERRAL_OPTIONS = [
    { value: 'friend', label: 'Friend / Word of mouth' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'google', label: 'Google Search' },
    { value: 'coaching', label: 'Coaching Center' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function ReferralScreen() {
    const router = useRouter();
    const { data, updateFields, submit } = useProfileSetup();
    const [selected, setSelected] = useState<string | null>(data.referral_source || null);
    const [submitting, setSubmitting] = useState(false);

    const handleFinish = async () => {
        setSubmitting(true);
        try {
            // Update referral if selected
            if (selected) {
                updateFields({ referral_source: selected });
            }
            // Brief wait so the context state is flushed (state updates are async)
            await new Promise(resolve => setTimeout(resolve, 100));
            // Submit to Supabase
            await submit();
            router.replace('/(public)/profile-setup/celebration');
        } catch (err: any) {
            console.error('[ProfileSetup] Submit failed:', err);
            Alert.alert(
                'Setup Failed',
                err.message || 'Could not save your profile. Please try again.',
                [{ text: 'OK' }]
            );
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Top bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        disabled={submitting}
                    >
                        <ArrowLeft color={submitting ? Colors.textDim : Colors.text} size={24} />
                    </TouchableOpacity>
                    <View style={styles.progressDots}>
                        <View style={[styles.dot, styles.dotActive]} />
                        <View style={[styles.dot, styles.dotActive]} />
                        <View style={[styles.dot, styles.dotActive]} />
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>One last thing! 🚀</Text>
                    <Text style={styles.subtitle}>
                        How did you hear about Drut? (Optional)
                    </Text>
                </View>

                {/* Options */}
                <View style={styles.optionList}>
                    {REFERRAL_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[
                                styles.optionRow,
                                selected === opt.value && styles.optionRowSelected,
                            ]}
                            onPress={() => setSelected(selected === opt.value ? null : opt.value)}
                            disabled={submitting}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    selected === opt.value && styles.optionTextSelected,
                                ]}
                            >
                                {opt.label}
                            </Text>
                            {selected === opt.value && (
                                <Check size={20} color={Colors.primary} strokeWidth={3} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Finish */}
                <TouchableOpacity
                    style={[styles.finishButton, submitting && styles.finishButtonDisabled]}
                    onPress={handleFinish}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#1A1A1A" />
                    ) : (
                        <Text style={styles.finishButtonText}>Finish Setup</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 24,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.border,
    },
    dotActive: {
        backgroundColor: Colors.primary,
        width: 32,
    },
    header: {
        marginBottom: 28,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textDim,
    },
    optionList: {
        gap: 10,
        marginBottom: 32,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        padding: 18,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    optionRowSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#ebf9e3',
    },
    optionText: {
        fontSize: 15,
        color: Colors.text,
    },
    optionTextSelected: {
        fontWeight: '600',
        color: Colors.primary,
    },
    finishButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    finishButtonDisabled: {
        opacity: 0.7,
    },
    finishButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
});
