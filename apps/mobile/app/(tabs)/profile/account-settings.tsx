import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    Mail,
    Phone,
    Key,
    Trash2,
    ChevronRight,
    Shield,
} from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { authService } from '@drut/shared';

export default function AccountSettingsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [resetSending, setResetSending] = useState(false);
    const [signupMethod, setSignupMethod] = useState<'email' | 'whatsapp'>('email');

    useEffect(() => {
        const load = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                const isSynthetic = (user.email || '').endsWith('@phone.drut.club');
                const method = user.user_metadata?.login_method === 'whatsapp_otp' || isSynthetic
                    ? 'whatsapp'
                    : 'email';
                setSignupMethod(method);

                const realEmail = user.user_metadata?.email_address
                    || (isSynthetic ? '' : user.email || '');
                setEmail(realEmail);

                const realPhone = user.user_metadata?.phone_number
                    || user.user_metadata?.phone
                    || user.phone
                    || '';
                setPhone(realPhone);
            }
            setLoading(false);
        };
        load();
    }, []);

    const handlePasswordReset = async () => {
        if (!email) {
            Alert.alert('No Email', 'Please add an email address first to enable password reset.');
            return;
        }
        setResetSending(true);
        try {
            await authService.resetPasswordForEmail(email);
            Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setResetSending(false);
        }
    };

    const formatPhone = (raw: string) => {
        if (!raw) return 'Not set';
        const stripped = raw.replace(/^91/, '');
        return `+91 ${stripped}`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Email */}
                <Text style={styles.sectionLabel}>Email</Text>
                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => router.push('/(tabs)/profile/change-email')}
                >
                    <Mail size={20} color={Colors.primary} />
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionLabel}>Email address</Text>
                        <Text style={styles.actionValue}>{email || 'Not set — tap to add'}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.textDim} />
                </TouchableOpacity>

                {/* Phone */}
                <Text style={styles.sectionLabel}>Phone</Text>
                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => router.push('/(tabs)/profile/change-phone')}
                >
                    <Phone size={20} color={Colors.primary} />
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionLabel}>Phone number</Text>
                        <Text style={styles.actionValue}>{formatPhone(phone)}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.textDim} />
                </TouchableOpacity>

                {/* Password — only for email-signup users */}
                {signupMethod === 'email' && (
                    <>
                        <Text style={styles.sectionLabel}>Password</Text>
                        <TouchableOpacity
                            style={styles.actionRow}
                            onPress={handlePasswordReset}
                            disabled={resetSending}
                        >
                            <Key size={20} color={Colors.primary} />
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionLabel}>Reset password</Text>
                                <Text style={styles.actionValue}>
                                    {resetSending ? 'Sending email...' : 'We\'ll email you a reset link'}
                                </Text>
                            </View>
                            {resetSending ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <ChevronRight size={18} color={Colors.textDim} />
                            )}
                        </TouchableOpacity>
                    </>
                )}

                {/* Security info */}
                <Text style={styles.sectionLabel}>Security</Text>
                <View style={styles.infoCard}>
                    <Shield size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Your data is encrypted and securely stored. Drut uses Supabase Auth.
                    </Text>
                </View>

                {/* Danger Zone */}
                <Text style={[styles.sectionLabel, styles.dangerLabel]}>Danger Zone</Text>
                <TouchableOpacity
                    style={styles.dangerRow}
                    onPress={() => router.push('/(tabs)/profile/delete-account')}
                >
                    <Trash2 size={20} color="#E53935" />
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.dangerLabelText}>Delete account</Text>
                        <Text style={styles.dangerValue}>Permanently delete after 7 days</Text>
                    </View>
                    <ChevronRight size={18} color="#E53935" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
    scrollContent: { padding: 24, paddingBottom: 40 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textDim,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginTop: 16,
    },
    dangerLabel: { color: '#E53935', marginTop: 32 },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 14,
        marginBottom: 8,
    },
    actionTextContainer: { flex: 1 },
    actionLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
    actionValue: { fontSize: 13, color: Colors.textDim, marginTop: 2 },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#ebf9e3',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    dangerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
        gap: 14,
    },
    dangerLabelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#E53935',
    },
    dangerValue: {
        fontSize: 13,
        color: '#991b1b',
        marginTop: 2,
    },
});
