import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { getSupabase } from '@drut/shared';

export default function PhoneLoginScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState('');

    const handleSendOTP = async () => {
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        if (!cleaned || cleaned.length < 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number.');
            return;
        }

        setLoading(true);
        try {
            // All OTP delivery is handled server-side by the edge function.
            // The edge function recognises the test number internally and returns OTP 123456.
            const supabase = getSupabase();
            const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
                body: { phone: cleaned },
            });

            if (error) {
                throw new Error(error.message || 'Could not send OTP. Please try again.');
            }
            if (data?.error) {
                throw new Error(data.error);
            }

            router.push({
                pathname: '/(public)/verify-otp',
                params: { phone: cleaned },
            });
        } catch (err: any) {
            Alert.alert(
                'Could Not Send OTP',
                err.message || 'Please check your connection and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

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
                        <MessageCircle size={40} color={Colors.primary} style={{ zIndex: 1 }} />
                    </View>
                    <Text style={styles.title}>Login with WhatsApp</Text>
                    <Text style={styles.subtitle}>
                        We'll send a 6-digit OTP to your WhatsApp number.
                    </Text>
                </View>

                {/* Phone Input */}
                <View style={styles.form}>
                    <View style={styles.phoneRow}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>+91</Text>
                        </View>
                        <View style={styles.phoneInputContainer}>
                            <Phone size={20} color={Colors.textDim} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone number"
                                placeholderTextColor={Colors.textDim}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                maxLength={10}
                                autoFocus
                            />
                        </View>
                    </View>

                    <Text style={styles.hint}>
                        You'll receive a verification code on your WhatsApp.
                    </Text>

                    {/* Send OTP Button */}
                    <TouchableOpacity
                        style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                        onPress={handleSendOTP}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.text} />
                        ) : (
                            <Text style={styles.sendButtonText}>Send OTP</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Prefer email? </Text>
                        <TouchableOpacity onPress={() => router.push('/(public)/login')}>
                            <Text style={styles.linkText}>Login with email</Text>
                        </TouchableOpacity>
                    </View>
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
        paddingHorizontal: 20,
    },
    form: {
        gap: 16,
    },
    phoneRow: {
        flexDirection: 'row',
        gap: 12,
    },
    countryCode: {
        width: 64,
        height: 56,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    phoneInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: Colors.white,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 18,
        color: Colors.text,
        letterSpacing: 1,
    },
    hint: {
        fontSize: 14,
        color: Colors.textDim,
        textAlign: 'center',
    },
    sendButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonDisabled: {
        opacity: 0.7,
    },
    sendButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: Colors.textDim,
        fontSize: 16,
    },
    linkText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
