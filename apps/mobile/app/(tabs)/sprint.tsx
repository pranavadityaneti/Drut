import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { Colors, Layout } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { Zap, Timer, Flame, Trophy, ArrowRight, BookOpen } from 'lucide-react-native';
import { authService, EXAM_TAXONOMY } from '@drut/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function SprintScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [targetExam, setTargetExam] = useState<string>('ap_eapcet'); // Default (Aligned with Taxonomy)

    useEffect(() => {
        const loadProfile = async () => {
            const user = await authService.getCurrentUser();
            if (user?.user_metadata?.exam_profile) {
                setTargetExam(user.user_metadata.exam_profile);
            }
        };
        loadProfile();
    }, []);

    const startSprint = (subject?: string) => {
        router.push({
            pathname: '/practice/session',
            params: {
                exam: targetExam,
                subject: subject || 'Physics', // Default to Physics if mixed (API needs subject usually, handle 'mixed' later or client side logic)
                // For a true "Mixed" sprint, backend needs to support subject='mixed' or we pick one relevant to the user's exam
                // For prototype, we'll default to Physics if global, or the specific subject passed.
                topic: 'mixed',
                mode: 'sprint'
            }
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <View>
                    <Text style={styles.headerTitle}>Sprint Arena</Text>
                    <Text style={styles.headerSubtitle}>Build speed & accuracy</Text>
                </View>
                <View style={styles.streakBadge}>
                    <Flame size={20} color={Colors.primary} fill={Colors.primary} />
                    <Text style={styles.streakText}>12</Text>
                </View>
            </View>

            {/* Hero Card - Daily Sprint */}
            <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() => startSprint()}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroLabelContainer}>
                        <Zap size={16} color="#FFF" fill="#FFF" />
                        <Text style={styles.heroLabel}>DAILY MIX</Text>
                    </View>
                    <Text style={styles.heroTitle}>Speed Challenge</Text>
                    <Text style={styles.heroDesc}>10 Questions • 10 Minutes</Text>

                    <View style={styles.heroButton}>
                        <Text style={styles.heroButtonText}>Start Now</Text>
                        <ArrowRight size={20} color={Colors.primary} />
                    </View>
                </View>
                {/* Decorative Icon */}
                <Timer size={120} color="rgba(255,255,255,0.1)" style={styles.heroBgIcon} />
            </TouchableOpacity>

            {/* Subject Sprints */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subject Sprints</Text>
                <View style={styles.grid}>
                    {['Physics', 'Chemistry', 'Math'].map((subject) => (
                        <TouchableOpacity
                            key={subject}
                            style={styles.subjectCard}
                            onPress={() => startSprint(subject)}
                        >
                            <View style={[styles.iconBox, { backgroundColor: getSubjectColor(subject) }]}>
                                <BookOpen size={24} color="#FFF" />
                            </View>
                            <Text style={styles.subjectTitle}>{subject}</Text>
                            <Text style={styles.subjectDesc}>Random Mix</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Recent Performance (Placeholder) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Speed Stats</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>45s</Text>
                        <Text style={styles.statLabel}>Avg Time</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>82%</Text>
                        <Text style={styles.statLabel}>Accuracy</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>Top 10%</Text>
                        <Text style={styles.statLabel}>Rank</Text>
                    </View>
                </View>
            </View>

        </ScrollView>
    );
}

// Helper for vibrant colors
const getSubjectColor = (subject: string) => {
    switch (subject) {
        case 'Physics': return '#3b82f6'; // Blue
        case 'Chemistry': return '#10b981'; // Emerald
        case 'Math': return '#f59e0b'; // Amber
        default: return Colors.primary;
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.textDim,
        marginTop: 4,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#ffedd5',
    },
    streakText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#c2410c',
    },
    heroCard: {
        marginHorizontal: 24,
        backgroundColor: '#1e293b', // Slate 800
        borderRadius: 24,
        overflow: 'hidden',
        height: 200,
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    heroContent: {
        padding: 24,
        height: '100%',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    heroLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    heroLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    heroTitle: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 38,
    },
    heroDesc: {
        color: '#94a3b8',
        fontSize: 16,
        marginBottom: 12,
    },
    heroButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF',
        alignSelf: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
    },
    heroButtonText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    heroBgIcon: {
        position: 'absolute',
        right: -20,
        bottom: -20,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
    },
    subjectCard: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    subjectTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    subjectDesc: {
        fontSize: 12,
        color: Colors.textDim,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textDim,
        fontWeight: '500',
    }
});
