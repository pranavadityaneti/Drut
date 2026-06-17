import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { authService } from '@drut/shared';
import { signInWithGoogle } from '../../lib/googleAuth';

export default function LoginScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            await authService.login(email, password);
            router.replace('/(tabs)/dashboard');
        } catch (err: any) {
            Alert.alert('Login Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleBusy(true);
        try {
            await signInWithGoogle();
            // AuthContext picks up the new session and root index.tsx routes
            // to dashboard or profile-setup automatically. Push to "/" to
            // re-evaluate that gate.
            router.replace('/');
        } catch (err: any) {
            const msg = err?.message || 'Could not sign in with Google.';
            if (msg !== 'Cancelled') {
                Alert.alert('Google sign-in failed', msg);
            }
        } finally {
            setGoogleBusy(false);
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
                        <Text style={styles.emoji}>👋</Text>
                    </View>
                    <Text style={styles.title}>Welcome back!</Text>
                    <Text style={styles.subtitle}>Log in to continue your progress.</Text>
                </View>

                {/* Google Sign-In — Primary */}
                <TouchableOpacity
                    style={[styles.googleButton, googleBusy && { opacity: 0.6 }]}
                    onPress={handleGoogleSignIn}
                    disabled={googleBusy || loading}
                >
                    <View style={styles.googleG}>
                        <Text style={styles.googleGText}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>
                        {googleBusy ? 'Signing in…' : 'Continue with Google'}
                    </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or use email</Text>
                    <View style={styles.divider} />
                </View>

                {/* Email Form */}
                <View style={styles.form}>
                    {/* Email */}
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

                    {/* Password */}
                    <View style={styles.inputContainer}>
                        <Lock size={20} color={Colors.textDim} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={Colors.textDim}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? (
                                <EyeOff size={20} color={Colors.textDim} />
                            ) : (
                                <Eye size={20} color={Colors.textDim} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.forgotButton}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.text} />
                        ) : (
                            <Text style={styles.loginButtonText}>Log In with Email</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(public)/signup')}>
                            <Text style={styles.signUpText}>Sign up</Text>
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
        marginBottom: 32,
    },
    iconContainer: {
        marginBottom: 20,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ebf9e3',
        position: 'absolute',
    },
    emoji: {
        fontSize: 40,
        zIndex: 1,
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
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    googleG: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    googleGText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#4285F4',  // Google blue
        lineHeight: 22,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        marginHorizontal: 16,
        color: Colors.textDim,
        fontSize: 14,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
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
        fontSize: 16,
        color: Colors.text,
    },
    forgotButton: {
        alignSelf: 'flex-end',
    },
    forgotText: {
        color: Colors.textDim,
        fontSize: 14,
    },
    loginButton: {
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
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 'auto',
        paddingTop: 24,
    },
    footerText: {
        color: Colors.textDim,
        fontSize: 16,
    },
    signUpText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
