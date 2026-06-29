import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Lock, Check } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { authService, getSupabase } from '@drut/shared';

// Parse a Supabase recovery redirect — handles PKCE (?code=) and implicit
// (#access_token=&refresh_token=). Mirrors login.tsx's helper.
function parseAuthRedirect(url: string): { access_token?: string; refresh_token?: string; code?: string } {
    const out: Record<string, string> = {};
    const grab = (s: string) => {
        for (const pair of s.split('&')) {
            const eq = pair.indexOf('=');
            if (eq > 0) out[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
        }
    };
    const q = url.indexOf('?');
    const h = url.indexOf('#');
    if (q >= 0) grab(url.slice(q + 1, h >= 0 ? h : undefined));
    if (h >= 0) grab(url.slice(h + 1));
    return out as { access_token?: string; refresh_token?: string; code?: string };
}

/**
 * Recovery landing — reached from the password-reset email deep link
 * (drut-mobile://update-password#access_token=...). Establishes the recovery session
 * from the link's tokens, then lets the user set a new password via
 * supabase.auth.updateUser({ password }). Previously this screen did not exist, so the
 * mobile reset flow was a dead end.
 */
export default function UpdatePasswordScreen() {
    const router = useRouter();
    const url = Linking.useURL();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    // null = establishing; true = recovery session ready; false = no/invalid link.
    const [sessionReady, setSessionReady] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const supabase = getSupabase();
            if (!supabase) { if (!cancelled) setSessionReady(false); return; }
            // Already signed in (e.g. opened in-app while authed) → can update directly.
            const { data: existing } = await supabase.auth.getSession();
            if (existing.session) { if (!cancelled) setSessionReady(true); return; }
            if (!url) return; // wait for the deep-link URL to arrive
            const { access_token, refresh_token, code } = parseAuthRedirect(url);
            try {
                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                } else if (access_token && refresh_token) {
                    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                    if (error) throw error;
                } else {
                    if (!cancelled) setSessionReady(false);
                    return;
                }
                if (!cancelled) setSessionReady(true);
            } catch {
                if (!cancelled) setSessionReady(false);
            }
        })();
        return () => { cancelled = true; };
    }, [url]);

    const handleSubmit = async () => {
        if (password.length < 8) { Alert.alert('Weak password', 'Use at least 8 characters.'); return; }
        if (password !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
        setLoading(true);
        try {
            await authService.updateUser({ password });
            setDone(true);
        } catch (err: any) {
            Alert.alert('Could not update password', (err?.message || 'The reset link may have expired — request a new one.'));
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <View style={styles.center}>
                <StatusBar style="dark" />
                <View style={styles.checkChip}><Check color={Colors.white} size={30} strokeWidth={3} /></View>
                <Text style={styles.title}>Password updated</Text>
                <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('/(public)/login')}>
                    <Text style={styles.buttonText}>Back to sign in</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (sessionReady === false) {
        return (
            <View style={styles.center}>
                <StatusBar style="dark" />
                <Text style={styles.title}>Reset link expired</Text>
                <Text style={styles.subtitle}>This password-reset link is invalid or has expired. Request a fresh one from the sign-in screen.</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('/(public)/forgot-password')}>
                    <Text style={styles.buttonText}>Request a new link</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Set a new password</Text>
                <Text style={styles.subtitle}>Choose a strong password you don't use elsewhere.</Text>

                <View style={styles.inputContainer}>
                    <Lock size={20} color={Colors.textDim} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="New password (min 8 chars)"
                        placeholderTextColor={Colors.textDim}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Lock size={20} color={Colors.textDim} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm password"
                        placeholderTextColor={Colors.textDim}
                        value={confirm}
                        onChangeText={setConfirm}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Update password</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
    title: { fontSize: 26, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: Colors.textDim, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, marginBottom: 12 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 52, fontSize: 15, color: Colors.text },
    button: { backgroundColor: Colors.primary, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, alignSelf: 'stretch' },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
    checkChip: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
