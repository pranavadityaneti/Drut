import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { ArrowLeft, User, MapPin, Phone, Mail, Camera } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useProfileSetup } from '../../../contexts/ProfileSetupContext';

export default function AboutYouScreen() {
    const router = useRouter();
    const { data, updateFields, signupMethod } = useProfileSetup();

    const [fullName, setFullName] = useState(data.full_name || '');
    const [city, setCity] = useState(data.city || '');
    const [phoneNumber, setPhoneNumber] = useState(data.phone_number || '');
    const [emailAddress, setEmailAddress] = useState(data.email_address || '');
    const [avatarUri, setAvatarUri] = useState<string | null>(data.avatar_uri || null);

    // Sync local state with context when context loads
    useEffect(() => {
        if (data.full_name && !fullName) setFullName(data.full_name);
        if (data.city && !city) setCity(data.city);
        if (data.phone_number && !phoneNumber) setPhoneNumber(data.phone_number);
        if (data.email_address && !emailAddress) setEmailAddress(data.email_address);
        if (data.avatar_uri && !avatarUri) setAvatarUri(data.avatar_uri);
    }, [data]);

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please allow access to your photo library to add a profile photo.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
            updateFields({ avatar_uri: result.assets[0].uri });
        }
    };

    const handleNext = () => {
        // Validate
        if (!fullName.trim() || fullName.trim().length < 2) {
            Alert.alert('Required', 'Please enter your full name.');
            return;
        }
        if (!city.trim() || city.trim().length < 2) {
            Alert.alert('Required', 'Please enter your city or location.');
            return;
        }

        if (signupMethod === 'email') {
            // Need phone number
            const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
            if (!cleaned || cleaned.length !== 10) {
                Alert.alert('Required', 'Please enter a valid 10-digit phone number.');
                return;
            }
            updateFields({
                full_name: fullName.trim(),
                city: city.trim(),
                phone_number: cleaned,
            });
        } else {
            // Need email
            const emailTrimmed = emailAddress.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
                Alert.alert('Required', 'Please enter a valid email address.');
                return;
            }
            updateFields({
                full_name: fullName.trim(),
                city: city.trim(),
                email_address: emailTrimmed,
            });
        }

        router.push('/(public)/profile-setup/academic');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <ArrowLeft color={Colors.text} size={24} />
                        </TouchableOpacity>
                        <View style={styles.progressDots}>
                            <View style={[styles.dot, styles.dotActive]} />
                            <View style={styles.dot} />
                            <View style={styles.dot} />
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Tell us about yourself 👋</Text>
                        <Text style={styles.subtitle}>A few quick basics to get started.</Text>
                    </View>

                    {/* Avatar picker */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
                            <View style={styles.avatarWrapper}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <User size={48} color={Colors.textDim} />
                                    </View>
                                )}
                                <View style={styles.cameraIcon}>
                                    <Camera size={16} color={Colors.text} />
                                </View>
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarLabel}>
                            {avatarUri ? 'Tap to change photo' : 'Add a profile photo (optional)'}
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Full Name */}
                        <View>
                            <Text style={styles.label}>Full Name *</Text>
                            <View style={styles.inputContainer}>
                                <User size={20} color={Colors.textDim} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor={Colors.textDim}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* City */}
                        <View>
                            <Text style={styles.label}>City / Location *</Text>
                            <View style={styles.inputContainer}>
                                <MapPin size={20} color={Colors.textDim} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Hyderabad, Vijayawada"
                                    placeholderTextColor={Colors.textDim}
                                    value={city}
                                    onChangeText={setCity}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Phone OR Email */}
                        {signupMethod === 'email' ? (
                            <View>
                                <Text style={styles.label}>Phone Number *</Text>
                                <Text style={styles.helperText}>We'll use this for WhatsApp updates.</Text>
                                <View style={styles.phoneRow}>
                                    <View style={styles.countryCode}>
                                        <Text style={styles.countryCodeText}>+91</Text>
                                    </View>
                                    <View style={[styles.inputContainer, { flex: 1 }]}>
                                        <Phone size={20} color={Colors.textDim} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="10-digit number"
                                            placeholderTextColor={Colors.textDim}
                                            value={phoneNumber}
                                            onChangeText={setPhoneNumber}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.label}>Email Address *</Text>
                                <Text style={styles.helperText}>For password recovery and updates.</Text>
                                <View style={styles.inputContainer}>
                                    <Mail size={20} color={Colors.textDim} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="you@example.com"
                                        placeholderTextColor={Colors.textDim}
                                        value={emailAddress}
                                        onChangeText={setEmailAddress}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Continue button */}
                    <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
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
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 24,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.border,
    },
    dotActive: {
        backgroundColor: Colors.primary,
        width: 32,
    },
    header: {
        marginBottom: 16,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatarLabel: {
        fontSize: 13,
        color: Colors.textDim,
        marginTop: 10,
        fontWeight: '500',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textDim,
    },
    form: {
        gap: 20,
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 6,
    },
    helperText: {
        fontSize: 12,
        color: Colors.textDim,
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
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
    },
    phoneRow: {
        flexDirection: 'row',
        gap: 10,
    },
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
    countryCodeText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    continueButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
});
