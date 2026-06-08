import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, Layout } from '../../constants/Colors';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { useState } from 'react';
import { authService } from '@drut/shared';

export default function SignupScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter your full name.');
            return;
        }
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const result = await authService.signup(email, password);

            if (result.sessionEstablished && result.user) {
                // Update user metadata with full name (rest of profile collected in wizard)
                await authService.updateUser({
                    data: { full_name: fullName.trim() },
                });
                // Send to profile-setup wizard (collects class, exam, school, etc.)
                router.replace('/(public)/profile-setup/welcome');
            } else {
                // Email confirmation required
                Alert.alert(
                    'Check Your Email',
                    'We sent you a confirmation link. Please verify your email to continue.',
                    [{ text: 'OK', onPress: () => router.replace('/(public)/login') }]
                );
            }
        } catch (err: any) {
            Alert.alert('Signup Failed', err.message);
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
                        <Text style={styles.emoji}>🚀</Text>
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join Drut and start acing your exams.</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {/* Full Name */}
                    <View style={styles.inputContainer}>
                        <User size={20} color={Colors.textDim} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full name"
                            placeholderTextColor={Colors.textDim}
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                        />
                    </View>

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
                            placeholder="Password (min 6 chars)"
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

                    {/* Signup Button */}
                    <TouchableOpacity
                        style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.text} />
                        ) : (
                            <Text style={styles.signupButtonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(public)/login')}>
                            <Text style={styles.loginText}>Log in</Text>
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
    signupButton: {
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
    signupButtonDisabled: {
        opacity: 0.7,
    },
    signupButtonText: {
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
    loginText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
