import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import {
    User,
    LogOut,
    ChevronRight,
    Sun,
    Bell,
    BookOpen,
    LifeBuoy,
    Star,
    Share2,
    FileText,
    Shield,
    Receipt,
    AlertTriangle,
    Info,
    Settings,
    Crown,
    Calendar,
} from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import {
    profileService,
    authService,
    UserProfile,
    getCurrentSubscription,
    isProActive,
    PRICING,
    type Subscription,
} from '@drut/shared';
import { PaywallModal } from '../../../components/PaywallModal';
import { UpgradeCard } from '../../../components/UpgradeCard';

const DANGER = '#c0392b';

const formatSubDate = (iso: string): string => {
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
};

type RowProps = {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    label: string;
    value?: string;
    onPress?: () => void;
    danger?: boolean;
    last?: boolean;
    soon?: boolean;
};

const Row: React.FC<RowProps> = ({ icon: Icon, label, value, onPress, danger, last, soon }) => {
    const press = soon ? () => Alert.alert(label, 'Coming soon — we’re building this.') : onPress;
    const body = (
        <View style={[styles.row, !last && styles.rowBorder]}>
            <Icon size={20} color={danger ? DANGER : Colors.textDim} />
            <Text style={[styles.rowLabel, danger && styles.dangerLabel]}>{label}</Text>
            {soon ? (
                <View style={styles.soonBadge}>
                    <Text style={styles.soonText}>Soon</Text>
                </View>
            ) : value ? (
                <Text style={styles.rowValue}>{value}</Text>
            ) : null}
            {press ? <ChevronRight size={18} color={danger ? '#e0b0a9' : Colors.textDim} /> : null}
        </View>
    );
    return press ? (
        <TouchableOpacity onPress={press} activeOpacity={0.6}>{body}</TouchableOpacity>
    ) : (
        body
    );
};

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [userMetaName, setUserMetaName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [sub, setSub] = useState<Subscription | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const isPro = isProActive(sub);

    const refreshSub = React.useCallback(() => {
        getCurrentSubscription().then(setSub).catch(() => setSub(null));
    }, []);

    useEffect(() => {
        loadProfile();
        refreshSub();
    }, [refreshSub]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const [data, user] = await Promise.all([
                profileService.getProfile(),
                authService.getCurrentUser(),
            ]);
            setProfile(data);
            setUserMetaName(user?.user_metadata?.full_name || '');
            // Real email if signed up via email; blank for legacy phone-only accounts.
            setUserEmail(
                user?.user_metadata?.email_address ||
                (user?.email?.endsWith('@phone.drut.club') ? '' : user?.email || '')
            );
        } finally {
            setLoading(false);
        }
    };

    const fullName = userMetaName || profile?.fullName || 'Set your name';
    const version = Application.nativeApplicationVersion ?? '1.0.0';

    const go = (path: string) => router.push(`/(tabs)/profile/${path}` as any);

    const handleLogout = () => {
        Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log out',
                style: 'destructive',
                onPress: async () => {
                    await authService.logout();
                    router.replace('/(public)/login');
                },
            },
        ]);
    };

    const handleShare = async () => {
        try {
            await Share.share({ message: 'Practice smarter for your entrance exams with Drut — https://drut.club' });
        } catch {
            /* user dismissed the share sheet */
        }
    };

    const showAbout = () => {
        Alert.alert('Drut', `Practice smarter for your entrance exams.\n\nVersion ${version}\nIdeaye Works Private Limited`);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Top bar: logout */}
                <View style={styles.topBar}>
                    <TouchableOpacity
                        onPress={handleLogout}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <LogOut size={22} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Identity → edit profile (where all profile data lives) */}
                <TouchableOpacity style={styles.identity} onPress={() => go('edit-profile')} activeOpacity={0.7}>
                    {profile?.avatarUrl ? (
                        <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={34} color={Colors.textDim} />
                        </View>
                    )}
                    <Text style={styles.name}>{fullName}</Text>
                    {userEmail ? <Text style={styles.email}>{userEmail}</Text> : null}
                </TouchableOpacity>

                {/* Go Pro card */}
                <UpgradeCard isPro={isPro} onUpgrade={() => setShowPaywall(true)} />

                {/* Subscription detail (Pro only) */}
                {isPro && sub ? (
                    <View style={styles.card}>
                        <Row icon={Crown} label="Plan" value={`Drut Pro · ${PRICING[sub.plan]?.label ?? sub.plan}`} />
                        <Row icon={Calendar} label="Valid until" value={formatSubDate(sub.expires_at)} last />
                    </View>
                ) : null}

                {/* Preferences */}
                <View style={styles.card}>
                    <Row icon={Sun} label="Appearance" soon />
                    <Row icon={Bell} label="Notifications" soon />
                    <Row icon={BookOpen} label="Exam preferences" onPress={() => go('exam-preferences')} last />
                </View>

                {/* Support */}
                <View style={styles.card}>
                    <Row icon={LifeBuoy} label="Help and support" onPress={() => go('help-support')} />
                    <Row icon={Star} label="Rate us" soon />
                    <Row icon={Share2} label="Share Drut" onPress={handleShare} last />
                </View>

                {/* About & legal */}
                <View style={styles.card}>
                    <Row icon={Info} label="About Drut" onPress={showAbout} />
                    <Row icon={FileText} label="Terms of service" soon />
                    <Row icon={Shield} label="Privacy policy" soon />
                    <Row icon={Receipt} label="Refund policy" soon />
                    <Row icon={AlertTriangle} label="Disclaimer" soon last />
                </View>

                {/* Account */}
                <View style={styles.card}>
                    <Row icon={Settings} label="Manage account" onPress={() => go('account-settings')} last />
                </View>

                <Text style={styles.version}>Drut v{version}</Text>
            </ScrollView>

            <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingTop: 10,
        paddingBottom: 2,
    },
    identity: {
        alignItems: 'center',
        paddingTop: 4,
        paddingBottom: 18,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
    },
    avatarPlaceholder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 19,
        fontWeight: '700',
        color: Colors.text,
        marginTop: 12,
    },
    email: {
        fontSize: 14,
        color: Colors.textDim,
        marginTop: 3,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        gap: 14,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    rowLabel: {
        flex: 1,
        fontSize: 15.5,
        color: Colors.text,
        fontWeight: '500',
    },
    rowValue: {
        fontSize: 14,
        color: Colors.textDim,
    },
    dangerLabel: {
        color: DANGER,
    },
    soonBadge: {
        backgroundColor: 'rgba(13,53,23,0.06)',
        borderRadius: 9,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    soonText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.textDim,
        letterSpacing: 0.2,
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: Colors.textDim,
        marginTop: 6,
    },
});
