import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import { getSupabase, authService } from '@drut/shared';

const OTP_LENGTH = 6;

/**
 * After successful OTP verification, route based on whether user has completed
 * profile setup. New users go through the wizard; returning users land on dashboard.
 */
async function routeAfterLogin(router: any) {
    try {
        const user = await authService.getCurrentUser();
        if (user?.user_metadata?.onboarding_completed) {
            router.replace('/(tabs)/dashboard');
        } else {
            router.replace('/(public)/profile-setup/welcome');
        }
    } catch {
        // Fallback to profile-setup if user fetch fails (safer than dashboard)
        router.replace('/(public)/profile-setup/welcome');
    }
}

export default function VerifyOTPScreen() {
    const router = useRouter();
    const { phone } = useLocalSearchParams<{ phone: string }>();
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [countdown, setCountdown] = useState(30);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];

        if (value.length > 1) {
            // Handle paste — fill all boxes
            const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
            for (let i = 0; i < OTP_LENGTH; i++) {
                newOtp[i] = digits[i] || '';
            }
            setOtp(newOtp);
            // Focus last filled input
            const lastIdx = Math.min(digits.length - 1, OTP_LENGTH - 1);
            inputRefs.current[lastIdx]?.focus();

            // Auto-verify if all filled
            if (digits.length === OTP_LENGTH) {
                setTimeout(() => handleVerify(newOtp), 300);
            }
            return;
        }

        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-advance to next input
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all digits entered
        if (value && index === OTP_LENGTH - 1 && newOtp.every(d => d)) {
            setTimeout(() => handleVerify(newOtp), 300);
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newOtp = [...otp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
        }
    };

    const handleVerify = async (otpDigits?: string[]) => {
        const otpCode = (otpDigits || otp).join('');
        if (otpCode.length !== OTP_LENGTH) {
            Alert.alert('Error', 'Please enter the complete 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            // All verification + user creation/sign-in happens server-side in the
            // verify-whatsapp-otp edge function. Server uses a secret to derive
            // passwords (not derivable from the phone number on the client).
            const supabase = getSupabase();
            const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
                body: { phone, otp: otpCode },
            });

            if (error) {
                throw new Error(error.message || 'Verification failed.');
            }
            if (data?.error) {
                throw new Error(data.error);
            }
            if (!data?.session) {
                throw new Error('No session returned. Please try again.');
            }

            await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            });
            await routeAfterLogin(router);
        } catch (err: any) {
            Alert.alert('Verification Failed', err.message || 'Invalid OTP. Please try again.');
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;

        setResending(true);
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
                body: { phone },
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            Alert.alert('OTP Resent', 'A new OTP has been sent to your WhatsApp.');
            setCountdown(30);
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const maskedPhone = phone
        ? `${phone.slice(0, 2)}****${phone.slice(-4)}`
        : '';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={Colors.text} size={24} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle} />
                        <ShieldCheck size={40} color={Colors.primary} style={{ zIndex: 1 }} />
                    </View>
                    <Text style={styles.title}>Verify OTP</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-digit code sent to{'\n'}
                        <Text style={styles.phoneHighlight}>{maskedPhone}</Text> on WhatsApp
                    </Text>
                </View>

                {/* OTP Input Boxes */}
                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={ref => { inputRefs.current[index] = ref; }}
                            style={[
                                styles.otpBox,
                                digit ? styles.otpBoxFilled : null,
                            ]}
                            value={digit}
                            onChangeText={value => handleOtpChange(value, index)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                            keyboardType="number-pad"
                            maxLength={index === 0 ? OTP_LENGTH : 1} // Allow paste on first box
                            autoFocus={index === 0}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                    onPress={() => handleVerify()}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.text} />
                    ) : (
                        <Text style={styles.verifyButtonText}>Verify</Text>
                    )}
                </TouchableOpacity>

                {/* Resend */}
                <View style={styles.resendContainer}>
                    {countdown > 0 ? (
                        <Text style={styles.resendCountdown}>
                            Resend OTP in {countdown}s
                        </Text>
                    ) : (
                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={handleResend}
                            disabled={resending}
                        >
                            <RefreshCw size={16} color={Colors.primary} />
                            <Text style={styles.resendText}>
                                {resending ? 'Sending...' : 'Resend OTP'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingTop: 60,
    },
    backButton: {
        marginBottom: 30,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        marginBottom: 20,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ebf9e3',
        position: 'absolute',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textDim,
        textAlign: 'center',
        lineHeight: 24,
    },
    phoneHighlight: {
        fontWeight: '700',
        color: Colors.text,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 32,
    },
    otpBox: {
        width: 48,
        height: 56,
        borderWidth: 2,
        borderColor: Colors.border,
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        backgroundColor: Colors.white,
    },
    otpBoxFilled: {
        borderColor: Colors.primary,
        backgroundColor: '#f0fdf4',
    },
    verifyButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyButtonDisabled: {
        opacity: 0.7,
    },
    verifyButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    resendContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    resendCountdown: {
        color: Colors.textDim,
        fontSize: 15,
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resendText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 15,
    },
});
