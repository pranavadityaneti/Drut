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
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { authService } from '@drut/shared';

const GRACE_PERIOD_DAYS = 7;

export default function DeleteAccountScreen() {
    const router = useRouter();
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText.trim().toUpperCase() !== 'DELETE') {
            Alert.alert('Confirm', 'Please type DELETE to confirm.');
            return;
        }

        setDeleting(true);
        try {
            // Soft delete: mark for deletion in metadata, sign out
            const deletionRequestedAt = new Date().toISOString();
            const deletionScheduledFor = new Date(
                Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
            ).toISOString();

            await authService.updateUser({
                data: {
                    deletion_requested_at: deletionRequestedAt,
                    deletion_scheduled_for: deletionScheduledFor,
                },
            });

            await authService.logout();

            Alert.alert(
                'Account scheduled for deletion',
                `Your account will be permanently deleted in ${GRACE_PERIOD_DAYS} days. Log in again before then to cancel.`,
                [{ text: 'OK', onPress: () => router.replace('/(public)/login') }]
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not delete account.');
            setDeleting(false);
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
                    <Text style={styles.headerTitle}>Delete Account</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.iconWrapper}>
                        <AlertTriangle size={40} color="#E53935" />
                    </View>
                    <Text style={styles.title}>Are you sure?</Text>
                    <Text style={styles.subtitle}>
                        This will delete your Drut account permanently.
                    </Text>

                    <View style={styles.warningCard}>
                        <Text style={styles.warningTitle}>What happens:</Text>
                        <Text style={styles.warningItem}>
                            • Your account is scheduled for deletion in {GRACE_PERIOD_DAYS} days
                        </Text>
                        <Text style={styles.warningItem}>
                            • All your practice history and analytics will be lost
                        </Text>
                        <Text style={styles.warningItem}>
                            • You can cancel by logging in again within {GRACE_PERIOD_DAYS} days
                        </Text>
                        <Text style={styles.warningItem}>
                            • After {GRACE_PERIOD_DAYS} days, data cannot be recovered
                        </Text>
                    </View>

                    <Text style={styles.confirmLabel}>
                        Type <Text style={styles.confirmKeyword}>DELETE</Text> to confirm
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="DELETE"
                        placeholderTextColor={Colors.textDim}
                        value={confirmText}
                        onChangeText={setConfirmText}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />

                    <TouchableOpacity
                        style={[
                            styles.deleteButton,
                            (deleting || confirmText.trim().toUpperCase() !== 'DELETE') &&
                            styles.deleteButtonDisabled,
                        ]}
                        onPress={handleDelete}
                        disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                    >
                        {deleting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.deleteButtonText}>Delete My Account</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
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
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E53935',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textDim,
        textAlign: 'center',
        marginBottom: 24,
    },
    warningCard: {
        backgroundColor: '#fef2f2',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
        marginBottom: 32,
        width: '100%',
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#991b1b',
        marginBottom: 12,
    },
    warningItem: {
        fontSize: 14,
        color: '#7f1d1d',
        lineHeight: 22,
        marginBottom: 4,
    },
    confirmLabel: {
        fontSize: 14,
        color: Colors.text,
        marginBottom: 12,
        alignSelf: 'flex-start',
    },
    confirmKeyword: {
        fontWeight: '700',
        color: '#E53935',
    },
    input: {
        borderWidth: 2,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
        backgroundColor: Colors.white,
        fontSize: 16,
        color: Colors.text,
        letterSpacing: 2,
        textAlign: 'center',
        fontWeight: '700',
        width: '100%',
        marginBottom: 24,
    },
    deleteButton: {
        backgroundColor: '#E53935',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    deleteButtonDisabled: {
        opacity: 0.4,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    cancelButton: {
        marginTop: 16,
        paddingVertical: 16,
    },
    cancelButtonText: {
        fontSize: 16,
        color: Colors.textDim,
        fontWeight: '600',
    },
});
