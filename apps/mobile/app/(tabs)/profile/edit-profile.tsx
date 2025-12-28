import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Camera, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../constants/Colors';
import { profileService, UserProfile } from '@drut/shared';

export default function EditProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        const data = await profileService.getProfile();
        if (data) {
            setProfile(data);
            setName(data.fullName);
            setPhone(data.phone || '');
            setAvatarUri(data.avatarUrl);
        }
        setLoading(false);
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setAvatarUri(asset.uri);

            // Upload immediately
            setUploading(true);
            try {
                // For mobile, we need to convert URI to blob and upload
                const response = await fetch(asset.uri);
                const blob = await response.blob();

                // Create a File-like object for the upload function
                const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

                const newUrl = await profileService.uploadAvatar(file);
                setAvatarUri(newUrl);
                Alert.alert('Success', 'Profile photo updated!');
            } catch (err: any) {
                Alert.alert('Upload Failed', err.message);
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await profileService.updateProfile({
                fullName: name,
                phone: phone || undefined,
            });

            if (result.success) {
                Alert.alert('Success', 'Profile updated successfully!');
                router.back();
            } else {
                Alert.alert('Error', result.error || 'Failed to update profile');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.saveButton}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <Check size={24} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {/* Avatar */}
                    <TouchableOpacity style={styles.avatarSection} onPress={handlePickImage}>
                        <View style={styles.avatarWrapper}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <User size={48} color={Colors.textDim} />
                                </View>
                            )}
                            {uploading && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                </View>
                            )}
                            <View style={styles.cameraIcon}>
                                <Camera size={16} color={Colors.text} />
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Form Fields */}
                    <View style={styles.formSection}>
                        {/* Name */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.fieldLabel}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor={Colors.textDim}
                            />
                        </View>

                        {/* Email (Read Only) */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.fieldLabel}>Email address</Text>
                            <View style={styles.readOnlyInput}>
                                <Text style={styles.readOnlyText}>{profile?.email}</Text>
                            </View>
                        </View>

                        {/* Customer ID (Read Only) */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.fieldLabel}>Customer ID</Text>
                            <View style={styles.readOnlyInput}>
                                <Text style={styles.readOnlyText}>{profile?.customerId}</Text>
                            </View>
                        </View>

                        {/* Phone Number */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.fieldLabel}>Phone number</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+91 XXXXX XXXXX"
                                placeholderTextColor={Colors.textDim}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    saveButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 60,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: Colors.white,
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    formSection: {
        paddingHorizontal: 24,
    },
    fieldContainer: {
        marginBottom: 24,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.text,
    },
    readOnlyInput: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingVertical: 12,
    },
    readOnlyText: {
        fontSize: 16,
        color: Colors.textDim,
    },
});
