/**
 * Home / Dashboard — the 10 launch metrics, re-laid out per Pranav's redirect.
 *
 * Layout (top -> bottom):
 *   1. Header: avatar + name + greeting (left), notifications bell (right)
 *   2. Streak hero card (white, large) with milestone progress ring
 *   3. Two small cards: Accuracy 7d  |  Concepts mastered
 *   4. Today's questions card (with quota for free users)
 *   5. UpgradeCard (Go Pro / Pro member)
 *   6. "Today, do this" — Quick Sprint + weakest topic row
 *   7. "This week" — 7-day sparkline + personal best
 *
 * Data sources:
 *   - useDashboardData (existing)         -> topicStats, sprintSummary, verifiedPatterns
 *   - fetchUserStreak (existing)
 *   - fetchWeeklyAccuracy (new, this slice)
 *   - fetchDailyCountsLast7Days (new, this slice)
 *   - getTodayQuestionUsage (existing)
 *   - profileService.getProfile (avatar)
 *
 * Notifications icon is real but the destination isn't built yet (push wiring
 * is forlater #54) — tap = honest "Coming soon" alert, no broken navigation.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    Flame,
    Bell,
    ArrowUp,
    ArrowDown,
    Bolt,
    Target,
    Trophy,
    ChevronRight,
    User as UserIcon,
    Award,
    Percent,
} from 'lucide-react-native';
import {
    useDashboardData,
    analyticsService,
    profileService,
    getCurrentSubscription,
    isProActive,
    getTodayQuestionUsage,
    type UserProfile,
} from '@drut/shared';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { UpgradeCard } from '../../components/UpgradeCard';
import { PaywallModal } from '../../components/PaywallModal';

const INK = '#16261a';
const MUTED = '#7c827b';
const ACCENT = '#b4fa8d';
const ACCENT_SOFT = '#eaf6dd';
const SUCCESS = '#3b6d11';
const WARN = '#854f0b';
const FREE_DAILY_QUOTA = 20;
const STREAK_MILESTONES = [7, 14, 30, 60, 100, 200, 365];

function pickGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

function nextMilestone(streak: number): number {
    for (const m of STREAK_MILESTONES) if (m > streak) return m;
    return STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
}

function subjectMasteryFromTopics(topicStats: any[] | undefined): Record<string, number> {
    const out: Record<string, { sum: number; n: number }> = {};
    for (const t of topicStats || []) {
        const subject: string = t?.topic?.subject;
        if (!subject) continue;
        if (!out[subject]) out[subject] = { sum: 0, n: 0 };
        out[subject].sum += Number(t.progressPercent) || 0;
        out[subject].n += 1;
    }
    const result: Record<string, number> = {};
    for (const k of Object.keys(out)) result[k] = Math.round(out[k].sum / out[k].n);
    return result;
}

export default function DashboardScreen() {
    const router = useRouter();
    const { loading, data, refetch } = useDashboardData();
    const { user } = useAuth();

    const [greeting] = useState<string>(pickGreeting());
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [streak, setStreak] = useState<number>(0);
    const [isPro, setIsPro] = useState<boolean>(false);
    const [questionsToday, setQuestionsToday] = useState<number>(0);
    const [weekly, setWeekly] = useState<{ this7: number; deltaPct: number } | null>(null);
    const [sparkline, setSparkline] = useState<number[]>([]);
    const [showPaywall, setShowPaywall] = useState<boolean>(false);

    const fullName =
        (user?.user_metadata?.full_name as string) ||
        profile?.fullName ||
        (data?.user?.user_metadata?.full_name as string) ||
        '';
    const firstName = fullName.split(' ')[0] || 'there';

    const refreshAll = useCallback(async () => {
        const [sub, sk, qt, wk, sp, pf] = await Promise.allSettled([
            getCurrentSubscription(),
            analyticsService.fetchUserStreak(),
            getTodayQuestionUsage(),
            analyticsService.fetchWeeklyAccuracy(),
            analyticsService.fetchDailyCountsLast7Days(),
            profileService.getProfile(),
        ]);
        if (sub.status === 'fulfilled') setIsPro(isProActive(sub.value));
        if (sk.status === 'fulfilled') setStreak(sk.value);
        if (qt.status === 'fulfilled') setQuestionsToday(qt.value);
        if (wk.status === 'fulfilled') setWeekly({ this7: wk.value.thisWeek.accuracy, deltaPct: wk.value.deltaPct });
        if (sp.status === 'fulfilled') setSparkline(sp.value);
        if (pf.status === 'fulfilled') setProfile(pf.value);
    }, []);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    const onRefresh = useCallback(async () => {
        await Promise.all([refetch(), refreshAll()]);
    }, [refetch, refreshAll]);

    const accuracy = weekly && weekly.this7 > 0 ? weekly.this7 : (data?.speedScore || 0);
    const hasDelta = !!weekly && Math.abs(weekly.deltaPct) >= 1;
    const conceptsMastered = data?.verifiedPatterns ?? 0;

    const subjectMastery = useMemo(() => subjectMasteryFromTopics(data?.topicStats), [data?.topicStats]);
    const weakest = useMemo(() => {
        const sorted = (data?.topicStats || []).slice().sort((a: any, b: any) => a.progressPercent - b.progressPercent);
        return sorted[0] || null;
    }, [data?.topicStats]);
    const bestScore = data?.sprintSummary?.bestScore ?? null;

    const milestone = nextMilestone(streak);
    const milestoneRemaining = Math.max(0, milestone - streak);

    const handleNotifications = () => {
        Alert.alert('Notifications', "We're wiring this up — daily reminders, streak nudges, and answer-review pings are coming soon.");
    };

    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}><UserIcon size={20} color={MUTED} /></View>
                        )}
                        <View>
                            <Text style={styles.greetingSmall}>{greeting},</Text>
                            <Text style={styles.greetingName}>{firstName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.bellBtn}
                        onPress={handleNotifications}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Bell size={20} color={INK} />
                    </TouchableOpacity>
                </View>

                {/* Streak hero card */}
                <View style={styles.streakCard}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.streakEyebrow}>
                            <Flame size={13} color={SUCCESS} />
                            <Text style={styles.streakEyebrowText}>Daily streak</Text>
                        </View>
                        <Text style={styles.streakNumber}>{streak}</Text>
                        <Text style={styles.streakUnit}>{streak === 1 ? 'day' : 'days'} in a row</Text>
                        {streak > 0 ? (
                            <Text style={styles.streakHint}>
                                {milestoneRemaining > 0
                                    ? `${milestoneRemaining} ${milestoneRemaining === 1 ? 'day' : 'days'} to ${milestone}`
                                    : 'Milestone hit — keep it going'}
                            </Text>
                        ) : (
                            <Text style={styles.streakHint}>Practice today to start a streak</Text>
                        )}
                    </View>
                    <MilestoneRing streak={streak} target={milestone} />
                </View>

                {/* Two small cards: Accuracy + Concepts mastered */}
                <View style={styles.twoColRow}>
                    <View style={[styles.smallCard, { marginRight: 6 }]}>
                        <View style={[styles.smallCardIcon, { backgroundColor: ACCENT_SOFT }]}>
                            <Percent size={16} color={SUCCESS} />
                        </View>
                        <Text style={styles.smallCardLabel}>Accuracy 7d</Text>
                        <Text style={styles.smallCardValue}>
                            {accuracy}<Text style={styles.smallCardUnit}>%</Text>
                        </Text>
                        {hasDelta ? (
                            <View style={styles.deltaRow}>
                                {weekly!.deltaPct > 0
                                    ? <ArrowUp size={11} color={SUCCESS} />
                                    : <ArrowDown size={11} color="#b3261e" />}
                                <Text style={[styles.deltaText, { color: weekly!.deltaPct > 0 ? SUCCESS : '#b3261e' }]}>
                                    {Math.abs(weekly!.deltaPct)}% vs last
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.smallCardHint}>This week so far</Text>
                        )}
                    </View>
                    <View style={[styles.smallCard, { marginLeft: 6 }]}>
                        <View style={[styles.smallCardIcon, { backgroundColor: '#fef0e0' }]}>
                            <Award size={16} color={WARN} />
                        </View>
                        <Text style={styles.smallCardLabel}>Mastered</Text>
                        <Text style={styles.smallCardValue}>
                            {conceptsMastered}
                        </Text>
                        <Text style={styles.smallCardHint}>
                            {conceptsMastered === 1 ? 'concept' : 'concepts'}
                        </Text>
                    </View>
                </View>

                {/* Today's questions */}
                <View style={styles.card}>
                    <View style={styles.qHeader}>
                        <Text style={styles.qHeaderLabel}>Today's questions</Text>
                        <Text style={styles.qHeaderValue}>
                            <Text style={styles.qBold}>{questionsToday}</Text>
                            <Text style={styles.qMuted}>{isPro ? ' today' : ` / ${FREE_DAILY_QUOTA} free`}</Text>
                        </Text>
                    </View>
                    <View style={styles.qBarTrack}>
                        <View
                            style={[
                                styles.qBarFill,
                                {
                                    width: isPro
                                        ? '100%'
                                        : `${Math.min(100, Math.round((questionsToday / FREE_DAILY_QUOTA) * 100))}%`,
                                    backgroundColor: isPro ? ACCENT : INK,
                                },
                            ]}
                        />
                    </View>
                    {!isPro && (
                        <Text style={styles.qHint}>
                            {Math.max(0, FREE_DAILY_QUOTA - questionsToday)} more on the free plan today
                        </Text>
                    )}
                </View>

                {/* Go Pro card */}
                <UpgradeCard isPro={isPro} onUpgrade={() => setShowPaywall(true)} />

                {/* Subject mastery */}
                <Text style={styles.sectionLabel}>Subject mastery</Text>
                <View style={styles.card}>
                    {(['Physics', 'Chemistry', 'Mathematics'] as const).map((sub, i, arr) => {
                        const pct = subjectMastery[sub] ?? 0;
                        const code = sub.slice(0, 3).toUpperCase();
                        return (
                            <View
                                key={sub}
                                style={[styles.masteryRow, i < arr.length - 1 && { marginBottom: 12 }]}
                            >
                                <Text style={styles.masteryCode}>{code}</Text>
                                <View style={styles.masteryTrack}>
                                    <View style={[styles.masteryFill, { width: `${pct}%` }]} />
                                </View>
                                <Text style={styles.masteryPct}>{pct}%</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Today, do this */}
                <Text style={styles.sectionLabel}>Today, do this</Text>
                <TouchableOpacity style={styles.actionCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/sprint')}>
                    <View style={[styles.actionIcon, { backgroundColor: ACCENT_SOFT }]}>
                        <Bolt size={19} color={SUCCESS} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>Quick Sprint</Text>
                        <Text style={styles.actionSub}>10 questions · ~5 min</Text>
                    </View>
                    <View style={styles.startPill}>
                        <Text style={styles.startPillText}>Start</Text>
                    </View>
                </TouchableOpacity>

                {weakest && (
                    <TouchableOpacity
                        style={styles.softRow}
                        activeOpacity={0.7}
                        onPress={() => router.push({
                            pathname: '/(tabs)/practice',
                            params: {
                                presetSubject: weakest.topic?.subject || '',
                                presetChapter: weakest.topic?.value || '',
                            },
                        } as any)}
                    >
                        <View style={[styles.actionIcon, { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fef0e0' }]}>
                            <Target size={15} color={WARN} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.softLabel}>Weakest this week</Text>
                            <Text style={styles.softTitle}>{weakest.topic?.label} · {weakest.progressPercent}%</Text>
                        </View>
                        <ChevronRight size={16} color="#c4c9c1" />
                    </TouchableOpacity>
                )}

                {/* This week */}
                <Text style={styles.sectionLabel}>This week</Text>
                {sparkline.length === 7 && (
                    <View style={styles.card}>
                        <View style={styles.sparkRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.softLabel}>Questions per day</Text>
                                <Text style={styles.sparkSummary}>
                                    <Text style={styles.qBold}>{sparkline.reduce((a, b) => a + b, 0)}</Text>
                                    <Text style={styles.qMuted}> this week</Text>
                                </Text>
                            </View>
                            <Sparkline data={sparkline} />
                        </View>
                    </View>
                )}

                {bestScore != null && bestScore > 0 && (
                    <View style={styles.softRow}>
                        <View style={[styles.actionIcon, { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fdf0e3' }]}>
                            <Trophy size={15} color="#7a5c00" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.softLabel}>Personal best · Sprint</Text>
                            <Text style={styles.softTitle}>{bestScore} / 10</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
        </SafeAreaView>
    );
}

const MilestoneRing: React.FC<{ streak: number; target: number }> = ({ streak, target }) => {
    const size = 72;
    const stroke = 6;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(1, target > 0 ? streak / target : 0);
    const dash = circumference * pct;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#ebefe8" strokeWidth={stroke} fill="none" />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={INK}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${dash}, ${circumference}`}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View style={styles.ringCenter}>
                <Text style={styles.ringNumber}>{target}</Text>
                <Text style={styles.ringUnit}>days</Text>
            </View>
        </View>
    );
};

const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
    const max = Math.max(1, ...data);
    return (
        <View style={styles.sparkBars}>
            {data.map((v, i) => {
                const h = Math.max(4, Math.round((v / max) * 34));
                const isToday = i === data.length - 1;
                const isRecent = i >= data.length - 3;
                const bg = isToday ? ACCENT : isRecent ? INK : '#ebefe8';
                return <View key={i} style={[styles.sparkBar, { height: h, backgroundColor: bg }]} />;
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 18,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    avatar: { width: 38, height: 38, borderRadius: 19 },
    avatarPlaceholder: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: Colors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    greetingSmall: { fontSize: 12, color: MUTED },
    greetingName: { fontSize: 17, fontWeight: '700', color: INK, marginTop: 1, letterSpacing: -0.2 },
    bellBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border,
        alignItems: 'center', justifyContent: 'center',
    },

    streakCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
    },
    streakEyebrow: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: ACCENT_SOFT,
        paddingHorizontal: 9, paddingVertical: 4,
        borderRadius: 10,
        marginBottom: 8,
    },
    streakEyebrowText: { fontSize: 11, fontWeight: '700', color: SUCCESS, letterSpacing: 0.3 },
    streakNumber: { fontSize: 38, fontWeight: '800', color: INK, letterSpacing: -1.2, lineHeight: 42 },
    streakUnit: { fontSize: 13, color: MUTED, marginTop: 1 },
    streakHint: { fontSize: 11.5, color: '#9aa09a', marginTop: 8 },

    ringCenter: { position: 'absolute', alignItems: 'center' },
    ringNumber: { fontSize: 17, fontWeight: '800', color: INK, lineHeight: 18 },
    ringUnit: { fontSize: 9, color: MUTED, marginTop: 1, letterSpacing: 0.3 },

    twoColRow: { flexDirection: 'row', marginBottom: 12 },
    smallCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: 16,
        padding: 14,
        minHeight: 110,
    },
    smallCardIcon: {
        width: 32, height: 32, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
    },
    smallCardLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
    smallCardValue: { fontSize: 24, fontWeight: '800', color: INK, marginTop: 2, letterSpacing: -0.5 },
    smallCardUnit: { fontSize: 15, fontWeight: '700' },
    smallCardHint: { fontSize: 11, color: '#9aa09a', marginTop: 3 },

    card: {
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 11.5,
        color: MUTED,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginTop: 8,
        marginBottom: 8,
        paddingHorizontal: 4,
    },

    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
    qHeaderLabel: { fontSize: 13.5, color: INK, fontWeight: '600' },
    qHeaderValue: { fontSize: 13, color: INK },
    qBold: { fontWeight: '700', color: INK },
    qMuted: { color: '#9aa09a' },
    qBarTrack: { height: 6, borderRadius: 3, backgroundColor: '#ebefe8', overflow: 'hidden' },
    qBarFill: { height: '100%' },
    qHint: { fontSize: 11.5, color: '#9aa09a', marginTop: 7 },

    masteryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    masteryCode: { width: 32, fontSize: 11, color: MUTED, fontWeight: '700' },
    masteryTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#ebefe8', overflow: 'hidden' },
    masteryFill: { height: '100%', backgroundColor: INK },
    masteryPct: { fontSize: 11.5, color: INK, fontWeight: '600', width: 36, textAlign: 'right' },

    actionCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border, borderRadius: 16,
        padding: 14, marginBottom: 10,
    },
    actionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    actionTitle: { fontSize: 14.5, color: INK, fontWeight: '700' },
    actionSub: { fontSize: 11.5, color: MUTED, marginTop: 1 },
    startPill: { backgroundColor: INK, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 7 },
    startPillText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },

    softRow: {
        flexDirection: 'row', alignItems: 'center', gap: 11,
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border, borderRadius: 16,
        padding: 13, marginBottom: 12,
    },
    softLabel: { fontSize: 12, color: MUTED },
    softTitle: { fontSize: 13.5, color: INK, fontWeight: '600', marginTop: 1 },

    sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    sparkSummary: { fontSize: 13, color: INK, marginTop: 2 },
    sparkBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 36 },
    sparkBar: { width: 8, borderRadius: 2 },

    deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
    deltaText: { fontSize: 11, fontWeight: '600' },
});
