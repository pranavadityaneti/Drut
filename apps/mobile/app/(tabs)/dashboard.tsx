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
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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
    Atom,
    FlaskConical,
    Sigma,
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

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [streak, setStreak] = useState<number>(0);
    const [isPro, setIsPro] = useState<boolean>(false);
    const [questionsToday, setQuestionsToday] = useState<number>(0);
    const [weekly, setWeekly] = useState<{ this7: number; deltaPct: number } | null>(null);
    const [sparkline, setSparkline] = useState<number[]>([]);
    const [showPaywall, setShowPaywall] = useState<boolean>(false);

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
    const subjectCards = useMemo(() => {
        const subjects = ['Physics', 'Chemistry', 'Mathematics'] as const;
        return subjects.map((sub) => {
            const stats = (data?.topicStats || []).filter((t: any) => t?.topic?.subject === sub);
            const weakest = stats.slice().sort((a: any, b: any) => a.progressPercent - b.progressPercent)[0] || null;
            return {
                subject: sub,
                pct: subjectMastery[sub] ?? 0,
                weakestLabel: weakest?.topic?.label || null,
            };
        });
    }, [data?.topicStats, subjectMastery]);
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
                    <Image
                        source={require('../../assets/logo-header.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.bellBtn}
                            onPress={handleNotifications}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Bell size={20} color={INK} />
                        </TouchableOpacity>
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}><UserIcon size={20} color={MUTED} /></View>
                        )}
                    </View>
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
                    <FlameBadge active={streak > 0} />
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
                <View style={styles.subjectCarouselWrap}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.subjectCarouselContent}
                        decelerationRate="fast"
                        snapToInterval={292}
                        snapToAlignment="start"
                    >
                        {subjectCards.map((c, i) => {
                            const Icon = c.subject === 'Physics' ? Atom : c.subject === 'Chemistry' ? FlaskConical : Sigma;
                            const tint = c.subject === 'Physics'
                                ? { bg: ACCENT_SOFT, icon: SUCCESS }
                                : c.subject === 'Chemistry'
                                ? { bg: '#fdf0e3', icon: '#a15b1a' }
                                : { bg: '#eef0ff', icon: '#4a5ab8' };
                            return (
                                <TouchableOpacity
                                    key={c.subject}
                                    activeOpacity={0.85}
                                    style={[styles.subjectCard, i < subjectCards.length - 1 && { marginRight: 12 }]}
                                    onPress={() => router.push({
                                        pathname: '/(tabs)/practice',
                                        params: { presetSubject: c.subject },
                                    } as any)}
                                >
                                    <View style={styles.subjectCardTop}>
                                        <View style={styles.subjectCardTopLeft}>
                                            <View style={[styles.subjectIconTile, { backgroundColor: tint.bg }]}>
                                                <Icon size={18} color={tint.icon} />
                                            </View>
                                            <Text style={styles.subjectName}>{c.subject}</Text>
                                        </View>
                                        <View style={styles.subjectProgressWrap}>
                                            <View style={styles.subjectProgressBar}>
                                                <View style={[styles.subjectProgressFill, { width: `${c.pct}%` }]} />
                                            </View>
                                            <Text style={styles.subjectPct}>{c.pct}%</Text>
                                        </View>
                                    </View>
                                    <View style={styles.subjectCardBottom}>
                                        {c.weakestLabel ? (
                                            <View style={styles.subjectChip}>
                                                <Target size={11} color={WARN} />
                                                <Text style={styles.subjectChipText} numberOfLines={1}>
                                                    Focus: {c.weakestLabel}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.subjectChip, { backgroundColor: '#f2f4f0' }]}>
                                                <Text style={[styles.subjectChipText, { color: MUTED }]} numberOfLines={1}>
                                                    Start practicing to see focus
                                                </Text>
                                            </View>
                                        )}
                                        <ChevronRight size={16} color="#c4c9c1" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
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

const FlameBadge: React.FC<{ active: boolean }> = ({ active }) => {
    // ~1.25 tall vs wide, matches the viewBox aspect
    const flameW = 52;
    const flameH = 65;
    const gradTop = active ? '#fbbf24' : '#e0e2dc';
    const gradMid = active ? '#f97316' : '#d5d9d3';
    const gradBottom = active ? '#ea580c' : '#c8ccc6';
    const innerHighlight = active ? '#fef3c7' : '#eef0ea';
    return (
        <View style={styles.flameBadge}>
            <Svg width={flameW} height={flameH} viewBox="0 0 32 40">
                <Defs>
                    <SvgLinearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
                        <Stop offset="0" stopColor={gradBottom} />
                        <Stop offset="0.55" stopColor={gradMid} />
                        <Stop offset="1" stopColor={gradTop} />
                    </SvgLinearGradient>
                </Defs>
                <Path
                    d="M16 2 C 10 10, 6 15, 7 24 C 8 33, 12 37, 16 37 C 20 37, 24 33, 25 24 C 26 15, 22 10, 16 2 Z"
                    fill="url(#flameGrad)"
                />
                <Path
                    d="M16 15 C 13 20, 12 22, 13 27 C 14 32, 15 34, 16 34 C 18 34, 19 31, 19 27 C 19 22, 18 19, 16 15 Z"
                    fill={innerHighlight}
                    opacity={0.75}
                />
            </Svg>
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
    logo: { width: 101, height: 55 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 38, height: 38, borderRadius: 19 },
    avatarPlaceholder: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: Colors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    bellBtn: {
        width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
    },

    streakCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: 16,
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

    flameBadge: {
        width: 84, height: 84, borderRadius: 22,
        backgroundColor: '#f4f6f1',
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 12,
    },

    twoColRow: { flexDirection: 'row', marginBottom: 12 },
    smallCard: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: 16,
        padding: 14,
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

    subjectCarouselWrap: { marginHorizontal: -20, marginBottom: 12 },
    subjectCarouselContent: { paddingHorizontal: 20 },
    subjectCard: {
        width: 280,
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: 16,
        padding: 14,
    },
    subjectCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subjectCardTopLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        flex: 1, minWidth: 0,
    },
    subjectIconTile: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    subjectName: { fontSize: 15, fontWeight: '700', color: INK, letterSpacing: -0.1 },
    subjectProgressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subjectProgressBar: {
        width: 60, height: 6, borderRadius: 3,
        backgroundColor: '#ebefe8', overflow: 'hidden',
    },
    subjectProgressFill: { height: '100%', backgroundColor: INK },
    subjectPct: { fontSize: 12, fontWeight: '700', color: INK },
    subjectCardBottom: {
        marginTop: 14,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', gap: 8,
    },
    subjectChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#fef0e0',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8,
        flexShrink: 1,
    },
    subjectChipText: { fontSize: 11.5, color: WARN, fontWeight: '600', flexShrink: 1 },

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
