import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout } from '../../constants/Colors';
import { useDashboardData } from '@drut/shared';
import { Settings, Bell, Zap, TrendingUp, Target, ChevronRight } from 'lucide-react-native';

export default function DashboardScreen() {
    const { loading, data, error, refetch } = useDashboardData();
    const [greeting, setGreeting] = useState('Good Morning');

    useEffect(() => {
        const hours = new Date().getHours();
        if (hours < 12) setGreeting('Good Morning');
        else if (hours < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const onRefresh = React.useCallback(() => {
        refetch();
    }, [refetch]);

    if (loading && !data) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{greeting},</Text>
                        <Text style={styles.username}>{data?.user?.user_metadata?.full_name || 'Champion'}</Text>
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell size={24} color={Colors.text} />
                            <View style={styles.badge} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Settings size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#ebf9e3' }]}>
                        <Target size={24} color={Colors.primary} />
                        <Text style={styles.statValue}>{data?.speedScore || 0}%</Text>
                        <Text style={styles.statLabel}>Accuracy</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#fdf4ff' }]}>
                        <Zap size={24} color="#d946ef" />
                        <Text style={styles.statValue}>{0}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                        <TrendingUp size={24} color="#f97316" />
                        <Text style={styles.statValue}>{data?.totalPatternsSeen || 0}</Text>
                        <Text style={styles.statLabel}>Patterns</Text>
                    </View>
                </View>

                {/* Main CTA: Quick Sprint */}
                <TouchableOpacity style={styles.sprintCard}>
                    <View style={styles.sprintTextContainer}>
                        <Text style={styles.sprintTitle}>Quick Sprint</Text>
                        <Text style={styles.sprintSubtitle}>10 intense questions to boost your speed.</Text>
                        <View style={styles.sprintButton}>
                            <Text style={styles.sprintButtonText}>Start Now</Text>
                            <ChevronRight size={16} color={Colors.white} />
                        </View>
                    </View>
                    <View style={styles.sprintIconContainer}>
                        <Zap size={60} color={Colors.white} fill={Colors.white} />
                    </View>
                </TouchableOpacity>

                {/* Weak Areas */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Topic Progress</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {data?.topicStats?.length ? (
                        data.topicStats
                            .sort((a, b) => a.progressPercent - b.progressPercent) // Show lowest progress first
                            .slice(0, 5)
                            .map((item: any, index: number) => (
                                <TouchableOpacity key={index} style={styles.weaknessCard}>
                                    <View style={styles.weaknessIcon}>
                                        <Target size={20} color={Colors.error} />
                                    </View>
                                    <Text style={styles.weaknessTopic} numberOfLines={1}>{item.topic.value}</Text>
                                    <Text style={styles.weaknessSubtopic} numberOfLines={2}>{item.topic.label}</Text>
                                    <View style={styles.accuracyTag}>
                                        <Text style={styles.accuracyText}>{item.progressPercent}% Done</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                    ) : (
                        <View style={styles.noDataCard}>
                            <Text style={styles.noDataText}>No data yet. Start a sprint!</Text>
                        </View>
                    )}
                </ScrollView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
    },
    greeting: {
        fontSize: 16,
        color: Colors.textDim,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 16,
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: Colors.surface,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.error,
        borderWidth: 1,
        borderColor: Colors.white,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 110,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textDim,
        marginTop: 4,
    },
    sprintCard: {
        backgroundColor: Colors.text, // Black card from reference
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        overflow: 'hidden',
    },
    sprintTextContainer: {
        flex: 1,
        zIndex: 1,
    },
    sprintTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.white,
        marginBottom: 8,
    },
    sprintSubtitle: {
        fontSize: 14,
        color: '#A0A0A0', // Light grey text
        marginBottom: 20,
    },
    sprintButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    sprintButtonText: {
        color: Colors.white,
        fontWeight: 'bold',
        marginRight: 4,
    },
    sprintIconContainer: {
        position: 'absolute',
        right: -10,
        bottom: -10,
        opacity: 0.2,
        transform: [{ rotate: '-15deg' }, { scale: 1.5 }],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    seeAll: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
    },
    horizontalScroll: {
        paddingRight: 24,
        gap: 12,
    },
    weaknessCard: {
        width: 160,
        padding: 16,
        backgroundColor: Colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    weaknessIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fee2e2', // Light red
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    weaknessTopic: {
        fontSize: 12,
        color: Colors.textDim,
        marginBottom: 4,
    },
    weaknessSubtopic: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 12,
        height: 40,
    },
    accuracyTag: {
        backgroundColor: Colors.white,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    accuracyText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.text,
    },
    noDataCard: {
        width: '100%',
        padding: 20,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        alignItems: 'center',
    },
    noDataText: {
        color: Colors.textDim,
    },
});
