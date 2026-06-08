import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { authService, getSupabase } from '@drut/shared';

const OTP_LENGTH = 6;

export default function ChangePhoneScreen() {
    const router = useRouter();
    const [step, setStep] = useState<'enter' | 'verify'>('enter');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const normalize = (p: string) => {
        const cleaned = p.replace(/[\s\-\(\)]/g, '');
        return cleaned.length === 10 ? '91' + cleaned : cleaned;
    };

    const handleSendOTP = async () => {
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        if (!cleaned || cleaned.length !== 10) {
            Alert.alert('Required', 'Please enter a valid 10-digit phone number.');
            return;
        }

        setSending(true);
        try {
            // Server-side OTP delivery (handles test number internally).
            const supabase = getSupabase();
            const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
                body: { phone: cleaned },
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            setStep('verify');
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            Alert.alert('Could Not Send OTP', err.message || 'Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleVerifyOTP = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== OTP_LENGTH) {
            Alert.alert('Required', 'Please enter the complete 6-digit OTP.');
            return;
        }

        setVerifying(true);
        try {
            const cleaned = phone.replace(/[\s\-\(\)]/g, '');
            const normalized = normalize(cleaned);

            // Validate the OTP against the server using the same phone_otps row
            // that send-whatsapp-otp stored. We don't need a full session here —
            // we only want to confirm the OTP matches, then update user_metadata.
            const supabase = getSupabase();
            const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
                body: { phone: cleaned, otp: otpCode },
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);
            if (!data?.session) throw new Error('Verification failed. Please try again.');

            // OTP verified server-side. Update the current user's phone_number.
            // (We don't switch the session — keep the current logged-in user.)
            await authService.updateUser({
                data: { phone_number: normalized },
            });

            Alert.alert('Updated', 'Your phone number has been changed.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Verification Failed', err.message || 'Invalid OTP.');
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setVerifying(false);
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
            for (let i = 0; i < OTP_LENGTH; i++) newOtp[i] = digits[i] || '';
            setOtp(newOtp);
            const last = Math.min(digits.length - 1, OTP_LENGTH - 1);
            inputRefs.current[last]?.focus();
            return;
        }
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => (step === 'verify' ? setStep('enter') : router.back())}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Change Phone Number</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {step === 'enter' ? (
                        <>
                            <View style={styles.iconWrapper}>
                                <Phone size={40} color={Colors.primary} />
                            </View>
                            <Text style={styles.title}>Enter your new phone number</Text>
                            <Text style={styles.subtitle}>
                                We'll send a 6-digit OTP to verify it on WhatsApp.
                            </Text>

                            <View style={styles.phoneRow}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.countryCodeText}>+91</Text>
                                </View>
                                <View style={[styles.inputContainer, { flex: 1 }]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="10-digit number"
                                        placeholderTextColor={Colors.textDim}
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, sending && styles.buttonDisabled]}
                                onPress={handleSendOTP}
                                disabled={sending}
                            >
                                {sending ? (
                                    <ActivityIndicator color="#1A1A1A" />
                                ) : (
                                    <Text style={styles.buttonText}>Send OTP</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.iconWrapper}>
                                <ShieldCheck size={40} color={Colors.primary} />
                            </View>
                            <Text style={styles.title}>Verify OTP</Text>
                            <Text style={styles.subtitle}>
                                Enter the 6-digit code sent to{'\n'}
                                <Text style={{ fontWeight: '700' }}>+91 {phone}</Text>
                            </Text>

                            <View style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={ref => { inputRefs.current[index] = ref; }}
                                        style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                                        value={digit}
                                        onChangeText={value => handleOtpChange(value, index)}
                                        keyboardType="number-pad"
                                        maxLength={index === 0 ? OTP_LENGTH : 1}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.button, verifying && styles.buttonDisabled]}
                                onPress={handleVerifyOTP}
                                disabled={verifying}
                            >
                                {verifying ? (
                                    <ActivityIndicator color="#1A1A1A" />
                                ) : (
                                    <Text style={styles.buttonText}>Verify & Update</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
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
    scrollContent: { padding: 24, alignItems: 'center' },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ebf9e3',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textDim,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    phoneRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 24 },
    countryCode: {
        width: 64,
        height: 54,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    countryCodeText: { fontSize: 16, fontWeight: '600', color: Colors.text },
    inputContainer: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
        backgroundColor: Colors.white,
        justifyContent: 'center',
    },
    input: { fontSize: 16, color: Colors.text, letterSpacing: 1 },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 32,
    },
    otpBox: {
        width: 44,
        height: 54,
        borderWidth: 2,
        borderColor: Colors.border,
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        backgroundColor: Colors.white,
    },
    otpBoxFilled: { borderColor: Colors.primary, backgroundColor: '#f0fdf4' },
    button: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
});
