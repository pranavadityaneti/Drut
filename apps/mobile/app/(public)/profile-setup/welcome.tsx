import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Sparkles } from 'lucide-react-native';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar style="dark" />
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle} />
                        <Sparkles size={42} color={Colors.primary} style={{ zIndex: 1 }} />
                    </View>
                    <Text style={styles.title}>Welcome to Drut! 🎉</Text>
                    <Text style={styles.subtitle}>
                        Let's set up your profile in under 30 seconds.
                    </Text>
                </View>

                {/* Body */}
                <View style={styles.body}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoText}>
                            We'll ask you a few quick questions so we can personalize your EAPCET prep journey.
                        </Text>
                    </View>

                    {/* Progress */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressDots}>
                            <View style={[styles.dot, styles.dotActive]} />
                            <View style={styles.dot} />
                            <View style={styles.dot} />
                        </View>
                        <Text style={styles.progressText}>Step 1 of 3</Text>
                    </View>
                </View>

                {/* Footer */}
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => router.push('/(public)/profile-setup/about-you')}
                >
                    <Text style={styles.continueButtonText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    iconContainer: {
        marginBottom: 24,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 90,
        height: 90,
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#ebf9e3',
        position: 'absolute',
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 17,
        color: Colors.textDim,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    body: {
        flex: 1,
        justifyContent: 'center',
        marginVertical: 40,
    },
    infoCard: {
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 32,
    },
    infoText: {
        fontSize: 15,
        color: Colors.text,
        lineHeight: 22,
        textAlign: 'center',
    },
    progressContainer: {
        alignItems: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
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
    progressText: {
        fontSize: 13,
        color: Colors.textDim,
        fontWeight: '600',
    },
    continueButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
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
