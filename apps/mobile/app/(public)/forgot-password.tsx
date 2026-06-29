import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ArrowLeft, Mail, Check } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { authService } from '@drut/shared';

/**
 * Forgot-password entry — sends the reset email with a deep link back to the in-app
 * /update-password recovery screen. Replaces the dead (no-op) "Forgot password?" button
 * that previously did nothing.
 */
export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        if (!email) { Alert.alert('Error', 'Please enter your email address.'); return; }
        setLoading(true);
        try {
            // Deep link the reset email back into the app's recovery screen.
            await authService.resetPasswordForEmail(email, Linking.createURL('update-password'));
            setSent(true);
        } catch (err: any) {
            Alert.alert('Failed', err?.message || 'Could not send the reset link.');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <View style={styles.center}>
                <StatusBar style="dark" />
                <View style={styles.checkChip}><Check color={Colors.white} size={30} strokeWidth={3} /></View>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>We sent a password-reset link to {email}. Open it on this device to set a new password.</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('/(public)/login')}>
                    <Text style={styles.buttonText}>Back to sign in</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={Colors.text} size={24} />
                </TouchableOpacity>

                <Text style={styles.title}>Forgot password</Text>
                <Text style={styles.subtitle}>Drop your email and we'll send a reset link.</Text>

                <View style={styles.inputContainer}>
                    <Mail size={20} color={Colors.textDim} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email address"
                        placeholderTextColor={Colors.textDim}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSend} disabled={loading}>
                    {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Send reset link</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
    backButton: { position: 'absolute', top: 16, left: 16, padding: 8 },
    title: { fontSize: 28, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: Colors.textDim, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, marginBottom: 12 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 52, fontSize: 15, color: Colors.text },
    button: { backgroundColor: Colors.primary, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, alignSelf: 'stretch' },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
    checkChip: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
