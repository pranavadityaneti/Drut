import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { authService } from '@drut/shared';

export default function ChangeEmailScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentEmail, setCurrentEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        const load = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                const isSynthetic = (user.email || '').endsWith('@phone.drut.club');
                const real = user.user_metadata?.email_address ||
                    (isSynthetic ? '' : user.email || '');
                setCurrentEmail(real);
                setNewEmail(real);
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
        const trimmed = newEmail.trim().toLowerCase();
        if (!trimmed) {
            Alert.alert('Required', 'Please enter an email address.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            Alert.alert('Invalid', 'Please enter a valid email address.');
            return;
        }
        if (trimmed === currentEmail.toLowerCase()) {
            Alert.alert('No Change', 'This is already your current email.');
            return;
        }

        setSaving(true);
        try {
            // Silent update — just save to user_metadata.email_address
            // (No verification flow, per user's choice)
            await authService.updateUser({
                data: { email_address: trimmed },
            });
            Alert.alert('Updated', 'Your email has been changed.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not update email.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Change Email</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.iconWrapper}>
                        <Mail size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Update your email</Text>
                    <Text style={styles.subtitle}>
                        We'll use this for password recovery and important updates.
                    </Text>

                    {currentEmail ? (
                        <View style={styles.currentEmailRow}>
                            <Text style={styles.currentEmailLabel}>Current email</Text>
                            <Text style={styles.currentEmailValue}>{currentEmail}</Text>
                        </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>New email address</Text>
                    <View style={styles.inputContainer}>
                        <Mail size={20} color={Colors.textDim} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor={Colors.textDim}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                            autoFocus
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, saving && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#1A1A1A" />
                        ) : (
                            <Text style={styles.buttonText}>Update Email</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
        paddingHorizontal: 20,
    },
    currentEmailRow: {
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        width: '100%',
    },
    currentEmailLabel: {
        fontSize: 12,
        color: Colors.textDim,
        fontWeight: '600',
        marginBottom: 4,
    },
    currentEmailValue: {
        fontSize: 15,
        color: Colors.text,
        fontWeight: '500',
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
        backgroundColor: Colors.white,
        width: '100%',
        marginBottom: 32,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: Colors.text },
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
