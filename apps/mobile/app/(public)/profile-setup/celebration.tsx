import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Sparkles, Target, GraduationCap, Calendar } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { authService, normalizeTargetExams } from '@drut/shared';

const EXAM_LABEL: Record<string, string> = { ap_eapcet: 'AP EAPCET', ts_eapcet: 'TG EAPCET', jee_main: 'JEE Main' };

export default function CelebrationScreen() {
    const router = useRouter();
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [userName, setUserName] = useState('');
    const [summaryData, setSummaryData] = useState<{
        target: string;
        year: string;
        examYear: string;
    } | null>(null);

    useEffect(() => {
        // Pop-in animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 60,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();

        // Load user data for summary
        authService.getCurrentUser().then(user => {
            if (user) {
                setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Champion');

                const targets = normalizeTargetExams(user.user_metadata?.target_exams);
                const examLabel = targets.length
                    ? targets.map(v => EXAM_LABEL[v] || v).join(' + ')
                    : 'EAPCET';

                const yearLabel = user.user_metadata?.year_in_school === 'Reappear'
                    ? 'Reappear'
                    : `Class ${user.user_metadata?.year_in_school || '12'}`;

                const examYearLabel = user.user_metadata?.target_exam_year === 'unknown'
                    ? 'TBD'
                    : user.user_metadata?.target_exam_year || '2026';

                setSummaryData({
                    target: examLabel,
                    year: yearLabel,
                    examYear: examYearLabel,
                });
            }
        });
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar style="dark" />
            <View style={styles.content}>
                {/* Hero */}
                <View style={styles.hero}>
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            { transform: [{ scale: scaleAnim }] },
                        ]}
                    >
                        <View style={styles.iconCircle} />
                        <Sparkles size={56} color={Colors.primary} style={{ zIndex: 1 }} />
                    </Animated.View>

                    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                        <Text style={styles.title}>You're all set, {userName}! 🎊</Text>
                        <Text style={styles.subtitle}>
                            Let's start your journey to{'\n'}EAPCET success.
                        </Text>
                    </Animated.View>
                </View>

                {/* Summary card */}
                {summaryData && (
                    <Animated.View style={[styles.summaryCard, { opacity: fadeAnim }]}>
                        <Text style={styles.summaryTitle}>Your Profile</Text>

                        <View style={styles.summaryRow}>
                            <Target size={18} color={Colors.primary} />
                            <Text style={styles.summaryLabel}>Target:</Text>
                            <Text style={styles.summaryValue}>
                                {summaryData.target} {summaryData.examYear}
                            </Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <GraduationCap size={18} color={Colors.primary} />
                            <Text style={styles.summaryLabel}>Currently:</Text>
                            <Text style={styles.summaryValue}>{summaryData.year}</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Calendar size={18} color={Colors.primary} />
                            <Text style={styles.summaryLabel}>Status:</Text>
                            <Text style={styles.summaryValue}>Ready to practice ✨</Text>
                        </View>
                    </Animated.View>
                )}

                {/* CTA */}
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => router.replace('/(tabs)/dashboard')}
                >
                    <Text style={styles.ctaButtonText}>Go to Dashboard</Text>
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
    },
    hero: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 32,
    },
    iconContainer: {
        marginBottom: 28,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 110,
        height: 110,
    },
    iconCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#ebf9e3',
        position: 'absolute',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textDim,
        textAlign: 'center',
        lineHeight: 24,
    },
    summaryCard: {
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 14,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textDim,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: Colors.textDim,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '600',
        flex: 1,
    },
    ctaButton: {
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
    ctaButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
});
