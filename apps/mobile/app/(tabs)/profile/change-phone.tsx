// Change phone number — simple metadata update.
//
// Previously this screen ran a 2-step WhatsApp OTP verification via WATI.
// WhatsApp auth has been removed from Drut (we use Google + email/password).
// Phone number is now stored as plain user_metadata.phone_number — useful
// for support contact but NOT used for authentication, so OTP verification
// is no longer required.

import React, { useState } from 'react';
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
import { ArrowLeft, Phone } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { authService } from '@drut/shared';

export default function ChangePhoneScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        if (!cleaned || cleaned.length !== 10) {
            Alert.alert('Required', 'Please enter a valid 10-digit phone number.');
            return;
        }

        setSaving(true);
        try {
            await authService.updateUser({
                data: { phone_number: '91' + cleaned },
            });
            Alert.alert('Updated', 'Your phone number has been saved.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Could Not Save', err?.message || 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

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
                    <Text style={styles.headerTitle}>Change Phone Number</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.iconWrapper}>
                        <Phone size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Update your phone number</Text>
                    <Text style={styles.subtitle}>
                        We use this only for support contact. It's not used to sign you in.
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
                        style={[styles.button, saving && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#1A1A1A" />
                        ) : (
                            <Text style={styles.buttonText}>Save Phone Number</Text>
                        )}
                    </TouchableOpacity>
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
